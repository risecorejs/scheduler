module.exports = async (a, b, c, timeout) => {
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(a, b, c)

      resolve(true)
    }, timeout)
  })
}
