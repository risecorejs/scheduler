const path = require('path')
const redis = require('@risecorejs/redis')()
const { isAfter } = require('date-fns')
const merge = require('merge')

const scheduler = {
  prefixInRedis: process.env.SCHEDULER_PREFIX_IN_REDIS || '@risecorejs/scheduler_',
  interval: process.env.SCHEDULER_INTERVAL || 1000,
  jobDir: process.env.SCHEDULER_JOB_DIR || path.resolve('jobs')
}

/**
 * ADD
 * @param jobPath {string}
 * @param executionDate {string}
 * @param options {{args?: Array, deletePrev?: boolean, label?: string, priority: ("high"|"middle"|"low")}}
 * @returns {Promise<void>}
 */
exports.add = async (jobPath, executionDate, options = {}) => {
  if (!jobPath || typeof jobPath !== 'string') {
    throw Error('"jobPath" is required and must be a string')
  }

  if (!executionDate || typeof executionDate !== 'string') {
    throw Error('"executionDate" is required and must be a string')
  }

  const keyStart = scheduler.prefixInRedis + jobPath

  if (options.deletePrev) {
    if (!options.label) {
      throw Error('"label" is required')
    }

    const keys = await redis.keys(`${keyStart}*${options.label}*`)

    if (keys.length) {
      await redis.del(keys, false)
    }
  }

  const key = `${keyStart}_${options.label ? options.label + '_' : ''}${new Date().valueOf()}`

  await redis.set(
    key,
    JSON.stringify({
      jobPath,
      executionDate,
      options,
      key,
      inWork: false
    })
  )
}

/**
 * START
 * @param options {{jobDir?: string, interval?: number, logging?: boolean}}
 */
exports.start = (options = {}) => {
  if (!options || options.__proto__ !== Object.prototype) {
    throw Error('"options" must be an object')
  }

  options = merge.recursive(
    {
      jobDir: scheduler.jobDir,
      interval: scheduler.interval,
      logging: true
    },
    options
  )

  if (!options.jobDir || typeof options.jobDir !== 'string') {
    throw Error('"jobDir" is required and must be a string')
  }

  if (typeof options.interval !== 'number' || isNaN(options.interval)) {
    throw Error('"interval" is required and must be a number')
  }

  setInterval(() => handler(options), options.interval)
}

/**
 * HANDLER
 * @param options {{jobDir?: string, interval?: number, logging?: boolean}}
 * @returns {Promise<void>}
 */
async function handler(options) {
  const keys = await redis.keys(scheduler.prefixInRedis + '*')

  if (!keys.length) return

  const high = []
  const middle = []
  const low = []

  const tasks = await getTasks()

  for (const task of tasks) {
    if (!isAfter(new Date(), new Date(task.executionDate))) continue

    if (task.options.priority) {
      switch (task.options.priority) {
        case 'high':
          high.push(task)
          break

        case 'middle':
          middle.push(task)
          break

        case 'low':
          low.push(task)
          break

        default:
          throw Error('Priority can only be: high, middle, low')
      }

      continue
    }

    await executor(options, task)
  }

  const queue = [...high, ...middle, ...low]

  if (!queue.length) return

  for (const task of queue) {
    await executor(options, task)
  }
}

/**
 * GET-TASKS
 * @returns {Promise<Array<Object>>}
 */
async function getTasks() {
  return await new Promise((resolve, reject) => {
    redis.client.mget(keys, async (err, res) => {
      if (err) reject(err)
      else {
        const result = new Map()

        for (const item of res) {
          const task = JSON.parse(item)

          if (!task.inWork) {
            task.inWork = true

            result.set(task.key, task)
          }
        }

        await new Promise((resolve, reject) => {
          redis.client.mset([...result].flat(), (err, res) => {
            if (err) reject(err)
            else resolve(res)
          })
        })

        resolve([...result.values()])
      }
    })
  })
}

/**
 * EXECUTOR
 * @param options {{jobDir?: string, interval?: number, logging?: boolean}}
 * @param task {{jobPath: string, executionDate: string, options: {args?: Array, deletePrev?: boolean, label?: string, priority: ("high"|"middle"|"low")}, key: string, inWork: boolean}}
 * @returns {Promise<void>}
 */
async function executor(options, task) {
  const logging = (msg) => {
    if (options.logging) console.log(msg)
  }

  const job = require(options.jobDir + task.jobPath)

  try {
    await job(...(task.options.args || []))

    logging('Job finished: ' + task.key)
  } catch (err) {
    logging('Job failed: ' + task.key)

    console.log(err)
  }

  await redis.del(task.key, false)
}
