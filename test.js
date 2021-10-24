const { addMinutes } = require('date-fns')
const redis = require('@risecorejs/redis')()

const scheduler = require('./index')

void (async () => {
  const id = scheduler.start()

  console.log(id)

  scheduler.add('test', addMinutes(new Date(), 1).toString(), {
    args: [1, 2, 3],
    deletePrev: true,
    label: 'test_123'
  })

  const keys = await redis.keys('*test_123*')

  console.log(keys)
})()
