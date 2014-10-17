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
        console.log("from / " +req.flash('message'));
        Item.find({active:true}, function(err, items){
            if(err) {
                res.send("There was an error. Please report this error code to primetime: 1")
                return console.error(err);
            }
            res.render('members.ejs', {
                items: items,
                message: req.flash('message')
            });
        })
    });

    function endBuy(message, req, res){
        console.log("from endbuy ");
        req.flash('message', message);
        console.log(req.flash('message'));
        res.redirect('/');
    }
    app.post('/buystore', function(req,res){
        if(!validator.isUUID(req.body.UUID)){
            endBuy("Not a valid passcode.", req, res);
            return;
        }

        console.log("Request made with UUID: " + req.body.UUID + " and item name: " + req.body.name);

        User.findOne({UUID: req.body.UUID}, function(err, user){
            if(err){
                endBuy("There was an error. Please report this error code to primetime: 2", req, res);
                throw err;
                return;
            }
            if(user){
                Item.findOne({name:req.body.name}, function(err, item){
                    if(err){
                        endBuy("There was an error, try again later.", req,  res);
                        throw err;
                        return;
                    }
                    if(item) {
                        if (user.ccp >= item.ccp && item.active && item.quantity > 0) {
                            Changelog.findOne({type: 'store'}, function (err, changelog) {
                                if (err) {
                                    endBuy("There was an error. Please report this error code to primetime: 3", req, res);
                                    throw err;
                                    return;
                                }
                                if (changelog) {
                                    var temp = '' + user.name + ' bought a ' + item.name + " for " + item.ccp + " ccp. CCP Change from " + user.ccp + " to " + (user.ccp- item.ccp) + ". Item Quantity Change from " + item.quantity + " to " + (item.quantity-1) + "\n\n";
                                    console.log(temp);
                                    changelog.content = changelog.content + temp;
                                    if (changelog.content.length > 100000) {
                                        if (changelog.content.indexOf('\n') != -1)
                                            changelog.content = changelog.content.substring(changelog.content.indexOf('\n'));
                                    }

                                    user.ccp = user.ccp - item.ccp;
                                    item.quantity = item.quantity - 1;

                                        changelog.save(function (err) {
                                            if (err) {
                                                endBuy("There was an error. Please report this error code to primetime: 4",req,  res);
                                                throw err;
                                                return;
                                            }
                                        });

                                        user.save(function (err) {
                                            if (err) {
                                                endBuy("There was an error. Please report this error code to primetime: 5",req,  res);
                                                throw err;
                                                return;
                                            }
                                        });

                                        item.save(function (err) {
                                            if (err) {
                                                endBuy("There was an error. Please report this error code to primetime: 6",req,  res);
                                                throw err;
                                                return;
                                            }
                                        });

                                    endBuy("Success! Your ccp is now at " + user.ccp, req, res);
                                    return;
                                }

                            })

                        } else {
                            endBuy("You do not have enough ccp or the item is no longer in the store.", req, res)
                            return;

                        }
                    } else {
                        endBuy("Item not found.", req, res);
                        return;
                    }
                })
            } else {
                endBuy("Passcode not recognized.", req, res)
                return;
            }
        })
    })

};
