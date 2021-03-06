const { addSeconds } = require('date-fns')
const redis = require('@risecorejs/redis')()

const scheduler = require('./index')

process.env.REDIS_PREFIX = 'szs'

void (async () => {
  const id = scheduler.start({
    jobDir: __dirname + '/jobs'
  })

  // console.log(id)
  //
  // const key = await scheduler.add('test', addSeconds(new Date(), 2).toString(), {
  //   args: [6, 5, 4, 1500],
  //   priority: 'low'
  // })
  //
  // console.log(key)

  await scheduler.add('test', addSeconds(new Date(), 2).toString(), {
    args: [4, 3, 2, 3000],
    deletePrev: true,
    label: 'test 4'
    // priority: 'middle'
  })

  await scheduler.add('test', addSeconds(new Date(), 2).toString(), {
    args: [4, 3, 2, 2000],
    deletePrev: true,
    label: 'test 4'
    // priority: 'middle'
  })

  await scheduler.add('test', addSeconds(new Date(), 2).toString(), {
    args: [4, 3, 2, 1000],
    deletePrev: true,
    label: 'test 4'
    // priority: 'middle'
  })

  // console.log(key)

  // await scheduler.add('test', addSeconds(new Date(), 2).toString(), {
  //   args: [2, 1, 0, 9000],
  //   deletePrev: true,
  //   label: 'test_2',
  //   priority: 'high'
  // })

  // const keys = await redis.keys('*')
  //
  // console.log(keys)
})()
