import dotenv from 'dotenv'
import NodeWebcam from 'node-webcam'
import Tesseract from 'tesseract.js'
import fs from 'fs'

dotenv.config()
const { CAMERA_NAME, OCR_WORKERS } = process.env

const scheduler = Tesseract.createScheduler()

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

const captureCard = NodeWebcam.create(camDefaults)
let captureCount = -1

const colors = {
  self: null,
  enemy: null
}

const run = async () => {
  const workers = Array(OCR_WORKERS)
  for (let i = 0; i < OCR_WORKERS; i++) {
    workers[i] = makeWorker()
  }
  await Promise.all(workers)
  setInterval(() => {
    captureCard.capture(`tmp/image${++captureCount}.png`, (err, loc) => {
      if (err) {
        console.error(err)
        return
      }
      // const imageBuffer = Buffer.from(data, 'base64')
      scheduler.addJob('recognize', loc).then(ocr => {
        const { text } = ocr.data

        if (text.toLowerCase().includes('matching')) {
          console.log('matching...')
          // set colors to the green and yellow that the lobby uses
        } else if (text.includes('0000')) {
          console.log('match starting. extracting colors...')
          // set colors from teams
          // maybe pause recognition for 3 min once we see this?
        } else if (text.toLowerCase().includes('vietory')) {
          console.log('[TF2 Voice] Victory!')
          // show winning team's color
        } else if (text.toLowerCase().includes('defeat')) { // @TODO verify this is how it reads that word
          console.log('YOU HAVE FAILED')
          // show winning team's color
        }
        fs.unlink(loc, () => { }) // delete the screenshot
      })
    })
  }, 1000)
}

run()
