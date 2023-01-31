const axios = require('axios');
const { parse } = require('csv-parse');

const fs = require('fs');

///////Telegram Bot으로부터 모니터링할 info를 받아옴 (chainId & baseToken) //////

let baseToken = "WETH";
let tim = 5000; //tim (ms) 마다 업데이트
let min_liquidity = 50000; //최소 liquidity
let total_data = 0;

/////reading csv file////////////////////////////////
let chains = {};
let data = [];
fs.createReadStream("./target/combined.csv")
  .pipe(
    parse({
      delimiter: ",",
      columns: true,
      ltrim: true,
    })
  )
  .on("data", function (row) {
    
    if (row['baseToken'] == baseToken && (total_data*(60000/tim) < 250) && (JSON.parse(row.liquidity).usd >= min_liquidity)){
      data.push(row);
      if (row['chainId'] in chains){ // chains안에 등록된 chainId일 경우
        if(chains[row['chainId']]['num'] < 30){
        chains[row['chainId']]['address'] = chains[row['chainId']]['address'].concat(",", row.pairAddress);
        chains[row['chainId']]['num'] += 1;
        total_data += 1;
        }
      }
      else {
        chains[row['chainId']] = {
          address: row.pairAddress,
          num: 1
      }
      total_data += 1;
    }
  }})
  .on("error", function (error) {
    console.log(error.message)
  })
  .on("end", function () {
    // 👇 log the result array
    //console.log("parsed csv data:")
    //console.log(data)
    console.log(chains)
    console.log(total_data)
  });
/////////////////////////////////////////////////////

// const data = [
//     {
//       'chainId': 'bsc',
//       dexId: 'coneexchange',
//       'baseToken:': 'BNBx',
//       baseTokenAddress: '0x1bdd3Cf7F79cfB8EdbB955f20ad99211551BA275',
//       quoteToken: 'WBNB',
//       quoteTokenAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
//       pairAddress: '0xE483f60682a11Da3455Dfa7912a6eaC6176F5797'
//     },
//     {
//       'chainId': 'bsc',
//       dexId: '0x71539D09D3890195dDa87A6198B98B75211b72F3',
//       'baseToken:': 'BNBx',
//       baseTokenAddress: '0x1bdd3Cf7F79cfB8EdbB955f20ad99211551BA275',
//       quoteToken: 'WBNB',
//       quoteTokenAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
//       pairAddress: '0xc5c929b9cbda49523634A80c7bFd67c0bce6C3ea'
//     },
//     {
//       'chainId': 'bsc',
//       dexId: 'apeswap',
//       'baseToken:': 'BNBx',
//       baseTokenAddress: '0x1bdd3Cf7F79cfB8EdbB955f20ad99211551BA275',
//       quoteToken: 'WBNB',
//       quoteTokenAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
//       pairAddress: '0xB88F211EC9ecfc2931Ae1DE53ea28Da76B9Ed37A'
//     }
//   ];

let iteration = 0
const interval = setInterval(function() {
  let result = [];
  let urls = []
  for (const c in chains){
    let url = `https://api.dexscreener.com/latest/dex/pairs/${c}/${chains[c]['address']}`;
    urls.push(url);
  }
   


  let requests = urls.map((url) => axios.get(url));


  axios.all(requests).then((res) => {
    res.forEach((r) => {
      let dat = r.data.pairs
      console.log(dat)
      for (let d of dat) {
      d.priceUsd = parseFloat(d.priceUsd)
      result.push(d)
      }
    });
  })
  .then((res) => {
    result.sort((a,b) => a.priceUsd - b.priceUsd)
    console.log("iteration #", iteration);
    console.log("Total Number of Pairs: ", result.length)
    console.log((result[result.length-1].priceUsd - result[0].priceUsd)*100/result[0].priceUsd + " %")
    console.log("High: ", result[result.length-1].priceUsd, "Low: ", result[0].priceUsd)
    console.log("High Address: ", result[result.length-1].pairAddress, "chainId: ", result[result.length-1].chainId)
    console.log("Low Address: ", result[0].pairAddress, "chainId: ", result[0].chainId)
    console.log("\n")
    iteration += 1;
  }
  );

}, tim);

