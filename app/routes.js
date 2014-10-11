// app/routes.js
module.exports = function(app, passport) {

    var User       		= require('../app/models/user');
    var Item = require('../app/models/item');
    var Changelog = require('../app/models/changelog')
    var validator = require('validator');

    app.get('/public', function(req, res){
        User.find({type: 'user'}, function(err,users){
            if(err) return console.error(err);

            var retArray = new Array();
            users.forEach(function(user){
                retArray.push({name: user.name, ccp:user.ccp});
            });
            res.render('public.ejs', {
                users: retArray
            });
        })
    })

    app.get('/loadstore', function(req, res){
       Item.find({active:true}, function(err, items){
           res.render('members.ejs', {
              items: items
           });
       })
    });

    app.post('/buystore', function(req,res){

        if(!validator.isUUID(req.body.UUID)){
            res.send("Not a valid passcode.")
            return;
        }

        User.findOne({UUID: req.body.UUID}, function(err, user){
            if(err){
                res.end("There was an error, try again later.");
                throw err;
                return;
            }
            if(user){
                Item.findOne({name:req.body.name}, function(err, item){
                    if(err){
                        res.end("There was an error, try again later.");
                        throw err;
                        return;
                    }
                    if(item) {
                        if (user.ccp >= item.ccp && item.active) {
                            Changelog.findOne({type: 'store'}, function (err, changelog) {
                                if (err) {
                                    res.end("There was an error, try again later.");
                                    throw err;
                                    return;
                                }
                                if (changelog) {
                                    changelog.content += user.name + " bought a " + item.name + " for " + item.ccp + " ccp."
                                    if (changelog.content.length > 100000) {
                                        if (changelog.content.indexOf('\n') != -1)
                                            changelog.content = changelog.content.substring(changelog.content.indexOf('\n'));
                                    }
                                    changelog.save(function (err) {
                                        if (err) {
                                            res.end("There was an error, try again later.");
                                            throw err;
                                            return;
                                        }
                                        user.ccp = user.ccp - item.ccp;
                                        user.save(function (err) {
                                            if (err) {
                                                res.end("There was an error, try again later.");
                                                throw err;
                                                return;
                                            }

                                            res.send("Success! Your ccp is now at " + user.ccp);
                                            return;
                                        })
                                    })
                                }
                            })
                        } else {
                            res.send("You do not have enough ccp or the item is no longer in the store.")
                            return;
                        }
                    } else {
                        res.send("Item not found.");
                        return;
                    }
                })
            } else {
                res.send("Passcode not recognized.")
                return;
            }
        })
    })

};
