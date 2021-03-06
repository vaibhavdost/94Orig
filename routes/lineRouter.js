const express = require('express');
const line = require('@line/bot-sdk');
const crawler = require('../crawler.js');
const router = express.Router();
const lineAccessToken = require('../config.js')[process.env.NODE_ENV].lineAccessToken;
const lineSecret = require('../config.js')[process.env.NODE_ENV].lineSecret;

const config = {
    channelAccessToken: lineAccessToken,
    channelSecret: lineSecret
};

router.post('/webhook', (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.status(200).json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

const client = new line.Client(config);
async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }

    let msg = event.message.text;
    let id = (event.source.groupId == undefined) ? event.source.userId : event.source.groupId;
    id = (event.source.roomId == undefined) ? event.source.userId : event.source.roomId;
    let targetArr = msg.match(/(?:https:\/\/www\.instagram\.com\/p\/\S{11}\/)|(?:https:\/\/instagram\.com\/\S+)|(?:https:\/\/(?:mobile\.)?twitter\.com\/\S+\/[0-9]+)/g);
    let isPup = (msg.match(/-pup/i) !== null) ? true : false;
    let forceUpdate = (msg.match(/--f/i) !== null) ? true : false;
    let res = [];
    try {
        res = await crawler.getImage(targetArr, isPup, forceUpdate);
        if (res.length !== 0) {
            console.log(`[LOG] Get ${res.length} Images/Videos`);
            let newArr = [];
            for (let i = 0; i < res.length; i++) {
                newArr = newArr.concat(res[i]);
            }

            // let msgArrObj = [];
            // let tmpVideoMsg = [];
            // let tmpTxtMsg = [];
            // for (let i = 0; i < newArr.length; i++) {
            //     let currentMsg = newArr[i];
            //     if (newArr.length <= 5) {
            //         if (/\.mp4/.test(currentMsg)) {
            //             msgArrObj.push({
            //                 'type': 'video',
            //                 "originalContentUrl": currentMsg,
            //                 "previewImageUrl": "https://pbs.twimg.com/profile_images/1269685818345394176/lPyLjEXz_400x400.jpg"
            //             });
            //         } else if (/\.jpe?g|\.png/i.test(currentMsg)) {
            //             msgArrObj.push({
            //                 'type': 'image',
            //                 "originalContentUrl": currentMsg,
            //                 "previewImageUrl": currentMsg
            //             });
            //         } else {
            //             msgArrObj.push({
            //                 'type': 'text',
            //                 'text': currentMsg
            //             });
            //         }
            //     } else {
            //         if (/\.mp4/.test(currentMsg)) {
            //             tmpVideoMsg.push(currentMsg);
            //         } else {
            //             tmpTxtMsg.push(currentMsg);
            //         }
            //     }
            // }

            // if (newArr.length > 5) {
            //     let msg = '圖片太多，超出 Line Api 單次發送限制，以下是剩下的圖片:\n';
            //     let count = 4;
            //     if (tmpVideoMsg.length !== 0) {
            //         for (let i = 0; i < tmpVideoMsg.length; i++) {
            //             let vid = tmpVideoMsg[i];

            //             if (count > 0) {
            //                 msgArrObj.push({
            //                     'type': 'video',
            //                     "originalContentUrl": vid,
            //                     "previewImageUrl": "https://pbs.twimg.com/profile_images/1269685818345394176/lPyLjEXz_400x400.jpg"
            //                 });
            //                 count--;
            //             } else {
            //                 msg += `- ${vid}\n`;
            //             }
            //         }
            //     }
            //     if (tmpTxtMsg.length !== 0) {
            //         for (let i = 0; i < tmpTxtMsg.length; i++) {
            //             let img = tmpTxtMsg[i];

            //             if (count > 0) {
            //                 msgArrObj.push({
            //                     'type': 'image',
            //                     "originalContentUrl": img,
            //                     "previewImageUrl": img
            //                 });
            //                 count--;
            //             } else {
            //                 msg += `- ${img}\n`;
            //             }
            //         }
            //     }
            //     msgArrObj.push({
            //         'type': 'text',
            //         'text': msg
            //     });
            // }

            let replyMsgArrObj = [];
            let pushMsgArrObj = [];
            for (let i = 0; i < newArr.length; i++) {
                let currentMsg = newArr[i];
                if (i < 5) {
                    if (/\.mp4/.test(currentMsg)) {
                        replyMsgArrObj.push({
                            'type': 'video',
                            "originalContentUrl": currentMsg,
                            "previewImageUrl": "https://pbs.twimg.com/profile_images/1269685818345394176/lPyLjEXz_400x400.jpg"
                        });
                    } else if (/\.jpe?g|\.png/i.test(currentMsg)) {
                        replyMsgArrObj.push({
                            'type': 'image',
                            "originalContentUrl": currentMsg,
                            "previewImageUrl": currentMsg
                        });
                    } else {
                        replyMsgArrObj.push({
                            'type': 'text',
                            'text': currentMsg
                        });
                    }
                } else {
                    if (/\.mp4/.test(currentMsg)) {
                        pushMsgArrObj.push({
                            'type': 'video',
                            "originalContentUrl": currentMsg,
                            "previewImageUrl": "https://pbs.twimg.com/profile_images/1269685818345394176/lPyLjEXz_400x400.jpg"
                        });
                    } else if (/\.jpe?g|\.png/i.test(currentMsg)) {
                        pushMsgArrObj.push({
                            'type': 'image',
                            "originalContentUrl": currentMsg,
                            "previewImageUrl": currentMsg
                        });
                    } else {
                        pushMsgArrObj.push({
                            'type': 'text',
                            'text': currentMsg
                        });
                    }
                }
            }

            client.replyMessage(event.replyToken, replyMsgArrObj)
                .catch((err) => {
                    console.error(err);
                });

            client.pushMessage(id, pushMsgArrObj)
                .catch((err) => {
                    console.error(err);
                });
        }
    } catch (error) {
        console.error(error);
        return Promise.reject(error);
    }

    return true;
}

module.exports = router;
