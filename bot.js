const Twitter = require("twitter");
require("dotenv").config({ path: "./config.env" });
const fetch = require("node-fetch");

//Create an Instance of Twitter API and Authenticate using App Keys
const twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_SECRET,
});

const newDogsThisHour = async () => {
  const hourAgo = new Date(new Date().getTime() - 1000 * 60 * 60).toISOString();
  let dogsWithPhotos = [];
  try {
    const tokenRes = await fetch("https://api.petfinder.com/v2/oauth2/token", {
      method: "POST",
      body: `grant_type=client_credentials&client_id=${process.env.PF_API_KEY}&client_secret=${process.env.PF_SECRET_KEY}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const { access_token } = await tokenRes.json();
    const dogResponse = await fetch(
      `https://api.petfinder.com/v2/animals?type=dog&location=98121&distance=100&after=${hourAgo}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const { animals } = await dogResponse.json();
    if (animals.length === 0) {
      console.log("No new dogs");
      return null;
    }
    if (animals.length > 0) {
      console.log("Found some dogs");
      //Filter dogs with photos
      dogsWithPhotos = animals.filter((animal) => animal.photos.length > 0);
      return dogsWithPhotos;
    }
  } catch (error) {
    console.log(error);
  }
};

const shareDog = async () => {
  const newDogs = await newDogsThisHour();
  if (newDogs) {
    twitterClient.post(
      "statuses/update",
      {
        status: `I'm looking for a home! My name is ${newDogs[0].name}. I am a ${newDogs[0].gender} ${newDogs[0].age} puppy. 
                ${newDogs[0].url} `,
      },
      function (err, tweet, response) {
        if (!err) console.log(tweet);
        else console.log(err);
      }
    );
    console.log("finish sharing");
  }
};

//create the Like/Favorites function
const likeTweet = (tweet_object) => {
  twitterClient.post(
    "favorites/create",
    { id: tweet_object.id_str },
    (err, data, response) => {
      if (!err) console.log("This is the tweet i'm liking", data);
      else console.log("Cannot like the tweet because", err);
    }
  );
};

//create the Retweet function
const retweetFn = (tweet_object) => {
  twitterClient.post(
    "statuses/retweet/" + tweet_object.id_str,
    (err, data, response) => {
      if (err) {
        console.log("Cannot Retweet your Tweet because of", err);
        return;
      }
      console.log("Success, Check your Account for the Retweet!");
    }
  );
};

//create a Searching function that searches tweets with the desired params
const searchTweets = (callback) => {
  let params = {
    q: "#puppy #dog filter:media",
    count: 1,
    result_type: "mixed",
    lang: "en",
  };

  twitterClient.get("search/tweets", params, (err, data, response) => {
    console.log("this is data length", data.statuses.length);
    console.log("tweet id is", data.statuses[0].id_str);
    console.log("tweet text is", data.statuses[0].text);
    if (data && data.statuses.length > 0) {
      //tweets results are stored in the data.statuses array, we only want 1 tweet so we access it via index
      let tweet = data.statuses[0];
      callback(tweet); // callback function that we passed in is the retweet function => we passed in the tweet to the retweet function
      return;
    } else {
      console.log("Cannot grab tweet because of ", err);
    }
  });
};

//get data from PetFinder API and set interval for 1hr
const adoptionDataTweets = () => {
  shareDog();
};
adoptionDataTweets();
setInterval(adoptionDataTweets, 1000 * 60 * 60); //share every hour afterwards

// #puppy retweets and set interval for 30mins
const puppyRetweets = () => {
  searchTweets(likeTweet);
  searchTweets(retweetFn);
};
puppyRetweets();
setInterval(puppyRetweets, 60 * 30 * 1000);
