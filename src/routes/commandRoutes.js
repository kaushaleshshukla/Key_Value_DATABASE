const express = require("express");
const commandRouter = express.Router();
const MongoClient = require('mongodb').MongoClient;
const FastMap = require("collections/fast-map");

const map = FastMap();


let router = function(){
    commandRouter.route('/set')
        .post( (req, res) => {
            console.log(req.body);
            const hasKey = map.has(req.body.key);

            //getting time to live
            let TTL = -1;
            if(req.body.EX || req.body.PX){
                //current time in millisecond
                TTL =  Date.now();
                if(req.body.EX){
                    console.log("Got Ex");
                    TTL += 1000*req.body.EX;
                }
                if(req.body.PX){
                    
                    console.log("Got Px");
                    TTL += 1*req.body.PX;
                }
                console.log(TTL);
            }

            if(TTL==-1 && hasKey && req.body.KEEPTTL){
                const val = map.get(req.body.key);
                TTL = val.TTL;
            }

            //new object for update
            let obj = {};
            obj.value = req.body.value;
            obj.TTL = TTL;

            //udpating value 
            if(req.body.type=="None"){
                if(hasKey){
                    //update in current map
                    map.set(req.body.key, obj);

                    //update in db ...
                    res.send("OK");
                }
                else{
                    //inserting in current map
                    map.add(obj, req.body.key);

                    //inserting in db ...
                    res.send("OK");
                }
            }
            else if(req.body.type=="NX"){
                if(hasKey){
                    res.send("NULL");
                }
                else{
                    //inserting in current map
                    map.add(obj, req.body.key);

                    //inserting in db ...
                    res.send("OK");
                }
            }
            else{
                if(!hasKey){
                    res.send("NULL");
                }
                else{
                    //update in current map
                    map.set(req.body.key, obj);

                    //update in db ...
                    res.send("OK");
                }
            }

        });

    commandRouter.route('/get')
        .get( (req, res) => {
            console.log(req.query.key);
            const hasKey = map.has(req.query.key);
            if(!hasKey){
                res.send("Nil");
            }
            else{
                let obj = map.get(req.query.key);
                let TTL = obj.TTL;
                let curTime = Date.now();
                if(TTL!=-1 && TTL<curTime){
                    //deleting from map
                    map.delete(req.query.key);
                    //deleting from db ...

                    res.send("Nil");
                }
                else{
                    res.send(obj.value);
                }
            }
        });

    commandRouter.route('/expire')
        .post( (req, res) => {
            console.log(req.body);
            const hasKey = map.has(req.body.key);
            if(!hasKey){
                res.send("0");
            }
            else{
                let TTL = Date.now();
                TTL += 1000*req.body.seconds;
                let obj = map.get(req.body.key);
                obj.TTL = TTL;

                //update in map
                map.set(req.body.key, obj);

                //update in db ...

                res.send("1");
            }
            
            
        });
    // Page not found
	commandRouter.route('/*')
        .all( (req, res) => {
            res.statusCode = 404;
            res.statusMessage = "Page Not Found";
            res.send("Page not found");
        });
    return commandRouter;
}

module.exports = router;