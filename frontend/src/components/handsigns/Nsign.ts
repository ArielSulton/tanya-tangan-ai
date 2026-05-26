import { Finger, FingerCurl, FingerDirection, GestureDescription } from 'fingerpose'

export const nSign = new GestureDescription('N')
// [
//     [
//       "Thumb",
//       "Half Curl or Full Curl",
//       "Diagonal Up Left"
//     ],
//     [
//       "Index",
//       "Full Curl",
//       "Vertical Up"
//     ],
//     [
//       "Middle",
//       "Full Curl",
//       "Vertical Up"
//     ],
//     [
//       "Ring",
//       "Full Curl",
//       "Vertical Up"
//     ],
//     [
//       "Pinky",
//       "Full Curl",
//       "Diagonal Up Left"
//     ]
//   ]

//Thumb
nSign.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0)
// Tolerate FullCurl too — when thumb is tucked under 2 fingers, MediaPipe
// often estimates it as fully curled rather than half. Without this N loses
// to T (which has a strictly NoCurl thumb that scores too well on noise).
nSign.addCurl(Finger.Thumb, FingerCurl.FullCurl, 1.0)
nSign.addDirection(Finger.Thumb, FingerDirection.DiagonalUpLeft, 0.7)

//Index
nSign.addCurl(Finger.Index, FingerCurl.FullCurl, 1)
nSign.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7)

//Middle
nSign.addCurl(Finger.Middle, FingerCurl.FullCurl, 1)
nSign.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7)

//Ring
nSign.addCurl(Finger.Ring, FingerCurl.FullCurl, 1)
nSign.addDirection(Finger.Ring, FingerDirection.VerticalUp, 0.7)

//Pinky
nSign.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1)
nSign.addDirection(Finger.Pinky, FingerDirection.DiagonalUpLeft, 0.7)
