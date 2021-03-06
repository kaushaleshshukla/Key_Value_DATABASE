const express = require("express");
const commandRouter = express.Router();
const MongoClient = require('mongodb').MongoClient;
const FastMap = require("collections/fast-map");
const SortedSet = require("collections/sorted-set");

//data structer for key value storage
const map = FastMap();
const zvalues = FastMap();


// database variables
const dbName = "Unacademy";
const tableName = "keyValue";
const url = "mongodb://localhost:27017";

let router = function(){
    commandRouter.route('/set')
        .post( (req, res) => {
            (async function(){
                let hasKey = map.has(req.body.key);

                //dynamic loading of data from database
                if(!hasKey){
                        //connecting database
                    let connection = await MongoClient.connect(url);

                    //getting database
                    let db = connection.db(dbName);

                    let keyTable = db.collection(tableName);

                    let result = await keyTable.findOne({"key" : req.body.key});

                    if(result && !result.set){
                        map.add(result.value, result.key);
                        hasKey = true;
                    }

                    connection.close();
                    
                }
                //getting time to live
                let TTL = -1;
                if(req.body.EX || req.body.PX){
                    //current time in millisecond
                    TTL =  Date.now();
                    if(req.body.EX){
                        TTL += 1000*req.body.EX;
                    }
                    if(req.body.PX){
                        TTL += 1*req.body.PX;
                    }

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

                        //update in db
                        //connecting database
                        let connection = await MongoClient.connect(url);

                        //getting database
                        let db = connection.db('Unacademy');

                        let keyTable = db.collection(tableName);

                        await keyTable.updateOne({"key" : req.body.key}, {$set : {"value" : obj}});
                        connection.close();

                        res.send("OK");
                    }
                    else{
                        //inserting in current map
                        map.add(obj, req.body.key);

                        //current data entry for database
                        data = {
                            key : req.body.key,
                            set : false,
                            value : obj
                        };
                        //inserting in db 
                        //connecting database
                        let connection = await MongoClient.connect(url);

                        //getting database
                        let db = connection.db('Unacademy');

                        let keyTable = db.collection(tableName);

                        await keyTable.insertOne(data);
                        connection.close();
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

                        //current data entry for database
                        data = {
                            key : req.body.key,
                            set : false,
                            value : obj
                        }
                        //inserting in db 
                        //connecting database
                        let connection = await MongoClient.connect(url);

                        //getting database
                        let db = connection.db('Unacademy');

                        let keyTable = db.collection(tableName);

                        await keyTable.insertOne(data);
                        connection.close();
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

                        //update in db 
                        //connecting database
                        let connection = await MongoClient.connect(url);

                        //getting database
                        let db = connection.db('Unacademy');

                        let keyTable = db.collection(tableName);

                        await keyTable.updateOne({"key" : req.body.key}, {$set : {"value" : obj}});
                        connection.close();
                        res.send("OK");
                    }
                }
            })();
        });

    commandRouter.route('/get')
        .get( (req, res) => {
            (async function(){
                let hasKey = map.has(req.query.key);
                
                //dynamic loading of data from database
                if(!hasKey){
                
                        //connecting database
                    let connection = await MongoClient.connect(url);

                    //getting database
                    let db = connection.db(dbName);

                    let keyTable = db.collection(tableName);

                    let result = await keyTable.findOne({"key" : req.query.key});
                    if(result && !result.set){
                        map.add(result.value, result.key);
                        hasKey = true;
                    }

                    connection.close();
                
                }
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

                        //deleting from db
                        //connecting database
                        let connection = await MongoClient.connect(url);
    
                        //getting database
                        let db = connection.db(dbName);
    
                        let keyTable = db.collection(tableName);
    
                        await keyTable.deleteOne({"key" : req.query.key});
                        connection.close();
                        res.send("Nil");
                    }
                    else{
                        res.send(obj.value);
                    }
                }
            })();
        });

    commandRouter.route('/expire')
        .post( (req, res) => {
            (async function(){
                let hasKey = map.has(req.body.key);
                //dynamic loading of data from database
                if(!hasKey){
                        //connecting database
                    let connection = await MongoClient.connect(url);

                    //getting database
                    let db = connection.db(dbName);

                    let keyTable = db.collection(tableName);

                    let result = await keyTable.findOne({"key" : req.body.key});

                    if(result && !result.set){
                        map.add(result.value, result.key);
                        hasKey = true;
                    }

                    connection.close();
                }
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

                    //update in db 
                    //connecting database
                    let connection = await MongoClient.connect(url);

                    //getting database
                    let db = connection.db(dbName);

                    let keyTable = db.collection(tableName);

                    await keyTable.updateOne({"key" : req.body.key}, {$set : {"value" : obj}});
                    connection.close();

                    res.send("1");
                }
            })();
            
        });
    
    commandRouter.route('/zadd')
        .post( (req, res) =>{
            (async function(){
                let hasKey = map.has(req.body.key);

                //dynamic loading of data from database
                if(!hasKey){
                    //connecting database
                    let connection = await MongoClient.connect(url);

                    //getting database
                    let db = connection.db(dbName);

                    let keyTable = db.collection(tableName);

                    let result = await keyTable.findOne({"key" : req.body.key});

                    if(result && result.set){
                        let currentSet = SortedSet();
                        let currentMap = FastMap();
                        for(let i=0; i<result.value.length; i++){
                            currentSet.push([1*result.value[i].score, result.value[i].member]);
                            currentMap.add(1*result.value[i].score, result.value[i].member);
                        }
                        map.add(currentSet, req.body.key);
                        zvalues.add(currentMap, req.body.key);
                        hasKey = true;
                    }
                    else if(result && !result.set){
                        hasKey = true;
                    }
                    connection.close();
                }
                if(hasKey){

                    if(!zvalues.has(req.body.key))
                        res.send("Error");

                    
                    else{
                        // checking for existance of current value in corresponding key
                        if(zvalues.get(req.body.key).has(req.body.value)){
                            // element found with same value
                            if(req.body.type=='XX' || req.body.type=='None'){
                                let score = 1*zvalues.get(req.body.key).get(req.body.value);

                                //deleting old instance of same value
                                zvalues.get(req.body.key).delete(req.body.value);
                                map.get(req.body.key).delete([score, req.body.value]);

                                //reinserting the element
                                zvalues.get(req.body.key).add(1*req.body.score, req.body.value);
                                map.get(req.body.key).push([1*req.body.score, req.body.value]);
                                res.send("1");

                                //update in database
                                //connecting database
                                let connection = await MongoClient.connect(url);
            
                                //getting database
                                let db = connection.db(dbName);
            
                                let keyTable = db.collection(tableName);
            
                                await keyTable.updateOne( {"key" : req.body.key}, 
                                {"$set" : {"value.$[elem].score" : 1*req.body.score} },
                                {
                                    multi : false,
                                    arrayFilters : [ {"elem.member" : req.body.value} ]
                                });
                                connection.close();
                            }

                            else{
                                res.send("nil");
                            }
                        }

                        else{
                            // element is not present in set
                            if(req.body.type=='XX'){
                                res.send('nil');
                            }
                            else{
                                //inserting the element
                                zvalues.get(req.body.key).add(1*req.body.score, req.body.value);
                                map.get(req.body.key).push([1*req.body.score, req.body.value]);
                                res.send("1");

                                data = {
                                    member : req.body.value,
                                    score : 1*req.body.score
                                };
                                //update in database
                                //connecting database
                                let connection = await MongoClient.connect(url);
            
                                //getting database
                                let db = connection.db(dbName);
            
                                let keyTable = db.collection(tableName);
            
                                await keyTable.updateOne({"key" : req.body.key},
                                {"$push" : {"value" : data}});
                                
                                connection.close();
                            }
                        }
                        
                    }
                }
                else{
                    //generating a new SortedSet
                    let currentSet = SortedSet();
                    currentSet.push([1*req.body.score, req.body.value]);

                    //generating a new FastMap
                    let currentMap = FastMap();
                    currentMap.add(1*req.body.score, req.body.value);

                    //inserting element
                    map.add(currentSet, req.body.key);
                    zvalues.add(currentMap, req.body.key);

                    res.send("1");

                    data = {
                        member : req.body.value,
                        score : 1*req.body.score
                    };

                    entry = {
                        key : req.body.key,
                        set : true,
                        value : [data]
                    };
                    //update in database
                    //connecting database
                    let connection = await MongoClient.connect(url);

                    //getting database
                    let db = connection.db(dbName);

                    let keyTable = db.collection(tableName);

                    await keyTable.insertOne(entry);
                    
                    connection.close();
                }
            })();
        });

    commandRouter.route('/zrank')
        .get( (req, res) =>{
            (async function(){
                if(!map.has(req.query.key)){
                    
                    //dynamic loading from database
                    //connecting database
                    let connection = await MongoClient.connect(url);

                    //getting database
                    let db = connection.db(dbName);

                    let keyTable = db.collection(tableName);

                    let result = await keyTable.findOne({"key" : req.query.key});
                    if(result && result.set){
                        let currentSet = SortedSet();
                        let currentMap = FastMap();
                        for(let i=0; i<result.value.length; i++){
                            currentSet.push([1*result.value[i].score, result.value[i].member]);
                            currentMap.add(1*result.value[i].score, result.value[i].member);
                        }
                        map.add(currentSet, req.query.key);
                        zvalues.add(currentMap, req.query.key);
                    }
                    connection.close();
                }
                if(map.has(req.query.key) && zvalues.has(req.query.key) && zvalues.get(req.query.key).has(req.query.member)){
                    //getting index
                    let index = map.get(req.query.key).indexOf([1*zvalues.get(req.query.key).get(req.query.member), req.query.member]);
                    data = {
                        index : index
                    }
                    res.send(`${data.index}`);
                }
                else{
                    //element not present
                    res.send("nil");
                }
            })();
        });

    commandRouter.route('/zrange')
        .get( (req, res) =>{
            (async function(){ 
                if(!map.has(req.query.key)){
                    
                    //dynamic loading from database
                    //connecting database
                    let connection = await MongoClient.connect(url);

                    //getting database
                    let db = connection.db(dbName);

                    let keyTable = db.collection(tableName);

                    let result = await keyTable.findOne({"key" : req.query.key});

                    if(result && result.set){
                        let currentSet = SortedSet();
                        let currentMap = FastMap();
                        for(let i=0; i<result.value.length; i++){
                            currentSet.push([1*result.value[i].score, result.value[i].member]);
                            currentMap.add(1*result.value[i].score, result.value[i].member);
                        }
                        map.add(currentSet, req.query.key);
                        zvalues.add(currentMap, req.query.key);
                    }
                    connection.close();
                }
                if(zvalues.has(req.query.key)){
                    let start = 1*req.query.start;
                    let stop = 1*req.query.stop;
                    let len = map.get(req.query.key).length;
                    if(start<0)
                        start = len+start;
                    if(stop<0)
                        stop = len+stop;
                    stop++;
                    if(start>=len || stop>len || start>=stop || start<0 || stop<=0){
                        let list = [];
                        res.send(list);
                    }
                    else{
                        let data = map.get(req.query.key).slice(start, stop);
                        let list = [];
                        if(req.query.WITHSCORES){
                            for(let i=0; i<data.length; i++){
                                list.push([data[i][1], data[i][0]]);
                            }
                        }
                        else{
                            for(let i=0; i<data.length; i++){
                                list.push([data[i][1]]);
                            }
                        }
                        res.send(list);
                    }
                }
                else{
                    let list = [];
                    res.send(list);
                }
            })();
        });

    // Page not found
	commandRouter.route('/*')
        .all( (req, res) => {
            res.statusCode = 404;
            res.statusMessage = "Page Not Found";
            res.send("Oops! I haven't implemented this yet :(");
        });
    return commandRouter;
}

module.exports = router;