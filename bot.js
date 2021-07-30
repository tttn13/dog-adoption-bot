const Twitter = require('twitter')
require('dotenv').config({ path: './config.env' })
const fetch = require('node-fetch')

const twitterClient = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET,
})

const newDogsThisHour = async () => {
    const hourAgo = new Date(new Date().getTime() - 1000 * 60 * 60).toISOString();
    let dogsWithPhotos = []
    try {
        const tokenRes = await fetch('https://api.petfinder.com/v2/oauth2/token', {
            method: 'POST',
            body: `grant_type=client_credentials&client_id=${process.env.PF_API_KEY}&client_secret=${process.env.PF_SECRET_KEY}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        console.log('this is token res', tokenRes)
        const { access_token } = await tokenRes.json()
        const dogResponse = await fetch(
            `https://api.petfinder.com/v2/animals?type=dog&location=98121&distance=100&after=${hourAgo}`,
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            }
        ) 
        const  { animals }  = await dogResponse.json()
        if (animals.length===0) {
            console.log("No new dogs")
            return null
        }
        if (animals.length > 0){
            console.log("Found some dogs")
            //Filter dogs with photos
            dogsWithPhotos = animals.filter(animal => animal.photos.length > 0)
            return dogsWithPhotos
        }     
            
    } catch (error) {
        console.log(error)
    }
}

const shareDog = async() => {
    const newDogs = await newDogsThisHour()
    if (newDogs) {
        twitterClient.post(
            'statuses/update',
            {
                status: `I'm looking for a home! My name is ${newDogs[0].name}. I am a ${newDogs[0].gender} ${newDogs[0].age} puppy. 
                ${newDogs[0].url} `,
            },
            function(err, tweet, response) {
                if(!err) console.log(tweet)
                else console.log(err)
            }
        )
        console.log("finish sharing")
    }
}

shareDog()
setInterval(shareDog, 1000 * 60 * 60) //share every hour afterwards
