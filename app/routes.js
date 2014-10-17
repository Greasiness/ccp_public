// app/routes.js
module.exports = function(app, passport) {

    var User       		= require('../app/models/user');
    var Item = require('../app/models/item');
    var Changelog = require('../app/models/changelog')
    var validator = require('validator');

    app.get('/public', function(req, res){
        User.find({type: 'user'}, function(err,users){
            if(err) {
                res.send("There was an error. Please report this error code to primetime: 0")
                return console.error(err);
            }

            var retArray = new Array();
            users.forEach(function(user){
                retArray.push({name: user.name, ccp:user.ccp});
            });
            res.render('public.ejs', {
                users: retArray
            });
        })
    })

    app.get('/', function(req, res){
       Item.find({active:true}, function(err, items){
           if(err) {
               res.send("There was an error. Please report this error code to primetime: 1")
               return console.error(err);
           }
           res.render('members.ejs', {
              items: items,
               message: ''
           });
       })
    });

    function endBuy(message, res){
        Item.find({active:true}, function(err, items){
            res.render('members.ejs', {
                items: items,
                message: message
            });
        })
    }
    app.post('/buystore', function(req,res){
        if(!validator.isUUID(req.body.UUID)){
            endBuy("Not a valid passcode.", res);
            return;
        }

        console.log("Request made with UUID: " + req.body.UUID + " and item name: " + req.body.name);

        User.findOne({UUID: req.body.UUID}, function(err, user){
            if(err){
                endBuy("There was an error. Please report this error code to primetime: 2", res);
                throw err;
                return;
            }
            if(user){
                Item.findOne({name:req.body.name}, function(err, item){
                    if(err){
                        endBuy("There was an error, try again later.", res);
                        throw err;
                        return;
                    }
                    if(item) {
                        if (user.ccp >= item.ccp && item.active && item.quantity > 0) {
                            Changelog.findOne({type: 'store'}, function (err, changelog) {
                                if (err) {
                                    endBuy("There was an error. Please report this error code to primetime: 3", res);
                                    throw err;
                                    return;
                                }
                                if (changelog) {
                                    changelog.content += user.name + " bought a " + item.name + " for " + item.ccp + " ccp. CCP Change from " + user.ccp + " to " + user.ccp- item.ccp + ". Item Quantity Change from " + item.quantity + " to " + item.quantity-1;
                                    if (changelog.content.length > 100000) {
                                        if (changelog.content.indexOf('\n') != -1)
                                            changelog.content = changelog.content.substring(changelog.content.indexOf('\n'));
                                    }

                                    user.ccp = user.ccp - item.ccp;
                                    item.quantity = item.quantity - 1;

                                        changelog.save(function (err) {
                                            if (err) {
                                                endBuy("There was an error. Please report this error code to primetime: 4", res);
                                                throw err;
                                                return;
                                            }
                                            changelogFlag = true;
                                        });

                                        user.save(function (err) {
                                            if (err) {
                                                endBuy("There was an error. Please report this error code to primetime: 5", res);
                                                throw err;
                                                return;
                                            }
                                            userFlag = true;
                                        });

                                        item.save(function (err) {
                                            if (err) {
                                                endBuy("There was an error. Please report this error code to primetime: 6", res);
                                                throw err;
                                                return;
                                            }
                                            itemFlag = true;
                                        });

                                    endBuy("Success! Your ccp is now at " + user.ccp, res);
                                    return;
                                }

                            })

                        } else {
                            endBuy("You do not have enough ccp or the item is no longer in the store.", res)
                            return;

                        }
                    } else {
                        endBuy("Item not found.", res);
                        return;
                    }
                })
            } else {
                endBuy("Passcode not recognized.", res)
                return;
            }
        })
    })

};
