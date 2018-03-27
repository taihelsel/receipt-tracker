const express = require('express');
const request = require("request");
const router = express.Router();


//Getting all prices from the api response
const getResultData = result => {
    let sub_top = 0;
    const prices = [];
    const totals = [];
    const lines = result.ParsedResults[0].TextOverlay.Lines;
    lines.forEach(line => {
        var z = [];
        line.Words.forEach(word => {
            word.WordText = word.WordText.replace(/[^\w\s.]/gi, '');
            let n = parseFloat(word.WordText);
            let x = word.WordText;
            if (x.toLowerCase().indexOf("subto") !== -1 || x.toLowerCase().indexOf("ubto") !== -1 || x.toLowerCase().indexOf("sub") !== -1) {
                totals.push(word)
            } else if (n == x) {
                prices.push(word);
            }
            x = x.toLowerCase();
            if(x.indexOf("sub") !== -1){
                z.push(x.indexOf("sub"));
            }
            if(x.indexOf("tot") !== -1){
                z.push(x.indexOf("tot"));
            }
        });
        if(z.length>=2){
            sub_top = line.MinTop;
        }
    });
    return [prices, totals, sub_top];
};
const findToatalData = (items, priceData) => {
    let lowestDiff = [];
    let receiptItems = null;
    items.forEach((item, i) => {
        lowestDiff.push({
            diff: 999999, //default diff
            price: null,
            itemIndex: null, //which total in the "item" array contains the lowest diff
        });
        priceData.forEach(price => {
            let diff = Math.abs(parseFloat(item.Top) - parseFloat(price.Top));
            if (diff < lowestDiff[i].diff) {
                //set new lowest diff
                lowestDiff[i].diff = diff;
                lowestDiff[i].price = parseFloat(price.WordText);
                lowestDiff[i].itemIndex = i;
            }
        });
    });
    let t = Math.max.apply(Math, lowestDiff.map(function (o) { return o.price; }));//gets total from highest "Total" found;
    return (t)
}
//generates equation based on prices from receipt and the total cost of all the items
const findEquation = (solution, input) => {
    let correctEquation = false;
    let testEquation = [];
    let f = function (prefix, input) {
        testEquation = [];
        for (let i = 0; i < input.length; i++) {
            testEquation.push(prefix + input[i].WordText);
            let product = testEquation[0].toString().split("/");
            product = product.reduce(function (a, b) { return parseFloat(a) + parseFloat(b) });
            if (solution === product) {
                correctEquation = testEquation.toString().split("/");
            }
            f(prefix + input[i].WordText + "/", input.slice(i + 1));
        }
    }
    f(0, input, 0);
    return correctEquation;
}
const fixPriceData = (data,sub_top,total) => {
    data.sort((a,b)=>a.Top - b.Top);
    let offset = 6;
    for(let i =0;i<data.length-1;i++){
        if( Math.abs(data[i].Top - data[i+1].Top) < offset && (data[i].WordText.indexOf(".")===-1 && data[i+1].WordText.indexOf(".")===-1  )){
            //items are probably on the same line;
            if(data[i].Left<data[i+1].Left){
                //item is greater
                data[i].WordText += "." + data[i+1].WordText;
            }else{
                //item is less
                data[i].WordText = data[i+1].WordText + "." + data[i].WordText;
            }
            data.splice(i+1,1);
        }
    }
    //Only Kepp items above the sub total
    data  = data.filter(item =>{
        if(item.Top < sub_top && parseFloat(item.WordText)<parseFloat(total)){
          return item;
        }
      });
     return data;
}
//Routes
router.post("/addreceipt",(req,res)=>{

    const IMG = "https://media-cdn.tripadvisor.com/media/photo-s/0a/79/1a/25/receipt-for-room-service.jpg";
    const KEY = "378c17102a88957";
    request.post("https://api.ocr.space/parse/image",{form: {
        apikey:KEY,
        url:IMG,
        language:"eng",
        isOverlayRequired:true,
    }},(error,response,body)=>{
        body = JSON.parse(body);
        let searchData = getResultData(body);
        let priceData = searchData[0];
        let sub_top = searchData[2];
        let totalLocation = findToatalData(searchData[1], priceData);
        priceData = fixPriceData(priceData,sub_top,totalLocation);
        let receiptPrices = findEquation(totalLocation,priceData);
        if(receiptPrices===false){
            console.log("Sub Total is",totalLocation,"\r\nNo Equation Found Potential item prices are",priceData);
        }else{
            console.log("Sub Toal:",totalLocation,"\r\nPrices:",receiptPrices);
        }
    });
    res.send();
});

module.exports = router;