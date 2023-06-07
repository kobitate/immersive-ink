import dotenv from 'dotenv'
import NodeWebcam from 'node-webcam'
import HomeAssistant from 'homeassistant'
import Tesseract from 'tesseract.js'
import Jimp from 'jimp'
import fs from 'fs'

dotenv.config()
const {
  DEBUG,
  CAMERA_NAME,
  OCR_WORKERS,
  HASS_HOST,
  HASS_PORT,
  HASS_TOKEN,
  HASS_LIGHT_LEFT,
  HASS_LIGHT_RIGHT
} = process.env

const scheduler = Tesseract.createScheduler()
let capturePaused = false
let matchStarting = false

const makeWorker = async () => {
  const worker = await Tesseract.createWorker()
  await worker.loadLanguage('eng')
  await worker.initialize('eng')
  scheduler.addWorker(worker)
}

const camDefaults = {
  width: 1280,
  height: 720,
  frames: 30,
  output: 'png',
  callbackReturn: 'location',
  device: CAMERA_NAME
}

const hass = new HomeAssistant({
  host: HASS_HOST,
  port: HASS_PORT,
  token: HASS_TOKEN
})

const captureCard = NodeWebcam.create(camDefaults)
let captureCount = -1

const officialColors = [
  '#9025c6',
  '#cdb121',
  '#3a0acd',
  '#cfbf05',
  '#d64b32',
  '#1ec0ad',
  '#c43a6f',
  '#19beab',
  '#2cb721',
  '#c12d74',
  '#6d05b6',
  '#cc510b',
  '#333bc4',
  '#dd6624',
  '#6425cd',
  '#bece41',
  '#ba31b0',
  '#9fc936',
  '#e48d23',
  '#1a1aae'
]

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null
}

const officialColorsRgb = officialColors.map(color => hexToRgb(color))

const getClosestColor = target => {
  let closestDistance = Infinity
  let closestColor = null

  const r1 = target.r
  const g1 = target.g
  const b1 = target.b
  officialColorsRgb.forEach(color => {
    const r2 = color.r
    const g2 = color.g
    const b2 = color.b

    const dist = Math.sqrt(
      (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
    )

    if (dist < closestDistance) {
      closestDistance = dist
      closestColor = color
    }
  })

  return closestColor
}

const colors = {
  self: null,
  enemy: null
}

const colorCoords = {
  self: [560, 20],
  enemy: [900, 20]
}

const setLightColors = (left, right) => {
  hass.services.call('turn_on', 'light', {
    entity_id: HASS_LIGHT_LEFT,
    rgb_color: [left.r, left.g, left.b]
  })
  hass.services.call('turn_on', 'light', {
    entity_id: HASS_LIGHT_RIGHT,
    rgb_color: right ? [right.r, right.g, right.b] : [left.r, left.g, left.b]
  })
}

const run = async () => {
  const workers = Array(OCR_WORKERS)
  for (let i = 0; i < OCR_WORKERS; i++) {
    workers[i] = makeWorker()
  }
  await Promise.all(workers)
  setInterval(() => {
    if (capturePaused) {
      return
    }

    captureCard.capture(`tmp/image${++captureCount}.png`, (err, loc) => {
      if (err) {
        console.error(err)
        return
      }
      // const imageBuffer = Buffer.from(data, 'base64')
      scheduler.addJob('recognize', loc).then(async ocr => {
        if (capturePaused) {
          return
        }
        let { text } = ocr.data

        text = text.toLowerCase()

        // @TODO #2 Refactor to be event subscription based
        if (matchStarting && !text.includes('Ink the most turf')) {
          matchStarting = false
          const pauseLength = DEBUG ? 5000 : 170000
          console.log(`pausing capture for ${pauseLength / 1000}s`)
          capturePaused = true

          // set colors from teams
          const jImage = await Jimp.read(loc)
          const self = Jimp.intToRGBA(jImage.getPixelColor(...colorCoords.self))
          const enemy = Jimp.intToRGBA(jImage.getPixelColor(...colorCoords.enemy))
          colors.self = getClosestColor(self)
          colors.enemy = getClosestColor(enemy)

          setLightColors(colors.self, colors.enemy)

          setTimeout(() => { capturePaused = false }, pauseLength)
        } else if (text.includes('matching')) {
          console.log('matching...')
          setLightColors(hexToRgb('#70bb3d'), hexToRgb('#aec038'))
          // set colors to the green and yellow that the lobby uses
        } else if (text.includes('ink the most turf')) { // @TODO #4 adapt for anarchy modes and more
          console.log('match starting, waiting for start screen')
          const pauseLength = 8000
          console.log(`pausing capture for ${pauseLength / 1000}s`)
          matchStarting = true
          capturePaused = true

          setTimeout(() => { capturePaused = false }, pauseLength)
        } else if (text.includes('vietory') && colors.self !== null) {
          console.log('[TF2 Voice] Victory!')
          setLightColors(colors.self)
        } else if (text.includes('befeat') && colors.enemy !== null) {
          console.log('YOU HAVE FAILED')
          setLightColors(colors.enemy)
        }
        fs.unlink(loc, () => { }) // delete the screenshot
      })
    })
  }, 1000)
}

run()
