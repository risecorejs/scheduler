const { addSeconds } = require('date-fns')
const redis = require('@risecorejs/redis')()

const scheduler = require('./index')

void (async () => {
  const id = scheduler.start({
    jobDir: __dirname + '/jobs'
  })

  // console.log(id)

  await scheduler.add('test', addSeconds(new Date(), 6).toString(), {
    args: [6, 5, 4],
    deletePrev: true,
    label: 'test_6'
  })

  await scheduler.add('test', addSeconds(new Date(), 4).toString(), {
    args: [4, 3, 2],
    deletePrev: true,
    label: 'test_4'
  })

  await scheduler.add('test', addSeconds(new Date(), 2).toString(), {
    args: [2, 1, 0],
    deletePrev: true,
    label: 'test_2'
  })

  const keys = await redis.keys()

  console.log(keys)
})()
