var auth,
	db = require(__dirname + "/../helpers/ndb"),
	curl = require('request'),
    crypto = require('crypto'),
    qs = require('querystring');


	/*** IMPORTANT ***/
	// by default, kielrsl-node stores your user data to the collection 'users'
	// if you want to use the implementation of oauth, kidnly follow the oauth procedure of the framework

auth = function (kiel){

	var login_check = function (req, res, app){
			if(app.valid_source.indexOf(req.post_args.source) === -1)
				throw "Invalid source for a request";
			db._instance().collection('users',function (err,_collection){
				var crdntls = {}
					, slctbl = {}
					, er = null;
				if(err){
					kiel.response(req, res, {data : err}, 500);
					return;
				}

				req.post_args.username && req.post_args.password && ( crdntls = {username : req.post_args.username});
				req.post_args.email && (req.post_args.password || req.post_args.google_access_token) && (crdntls = {email:req.post_args.email});

				slctbl = {"email":1,"profile_info":1,"password":1,"google_access_token":1,"email_confirmed":1,"is_system_admin":1,"google_credentials":1,"contact_info":1};
				slctbl['data_' + app._id] = 1;

				if(Object.keys(crdntls).length === 0)
					throw "Invalid credentials for login.";

                console.log()

				_collection.find(crdntls,slctbl).toArray(function (err, d){
					if(err){
						kiel.response(req, res, {data : err}, 500);
						return;
					}
					if(d.length === 1) {
						console.log('passss');
						console.log(d[0]._id);
						console.log(d[0].password);
						console.log(kiel.utils.hash(kiel.utils.hash(req.post_args.password) + kiel.application_config.salt));
						!!~['self', 'position_music'].indexOf(req.post_args.source) && d[0].password !== kiel.utils.hash(kiel.utils.hash(req.post_args.password) + kiel.application_config.salt) && (er = "Password does not match.");
						if(er){
							kiel.response(req, res, {data : er}, 400);
							return;
						}
						if(req.post_args.source === "google" && req.post_args.google_access_token){
							curl("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token="+req.post_args.google_access_token ,function (err,rs,body){
								if(!err && rs.statusCode == 200) {
									var s = JSON.parse(body);
									if(s.email !== d[0].email) {
										kiel.response(req, res, {data : "Invalid access token for email."}, 400);
										return;
									} else {
										//add app if user of new app
										if(!d[0]['data_' + app._id]) {
											add_app(_collection,app,d[0]);
											d[0]['data_' + app._id] = {user_scopes:app.basic_scopes};
										}
										delete d[0].password;
										delete d[0].google_access_token;
										kiel.logger("User identity confirmed [google]: "+d[0]._id,'access')
										kiel.response(req, res, {user_data : d[0],scope_token:app.scope_token}, 200);
									}

								} else {
									err || (err = "Cannot authenticate google access token, token might be expired or invalid.");
									kiel.response(req, res, {data : err}, 400);
									return;
								}
							});
						} else {
							//add app if user of new app
							if(!d[0]['data_' + app._id]) {
								add_app(_collection,app,d[0]);
								d[0]['data_' + app._id] = {user_scopes:app.basic_scopes};
							}
							delete d[0].password;
							delete d[0].google_access_token;
							console.log("User identity confirmed [login]: "+d[0]._id,'access')
							kiel.logger("User identity confirmed [login]: "+d[0]._id,'access')
							kiel.response(req, res, {user_data : d[0],scope_token:app.scope_token}, 200);
						}
					} else if(d.length === 0) {
						kiel.response(req, res, {data : "That email does not belong to any account.", new_user : true}, 404);
					} else {
						kiel.response(req, res, {data : "Email is already associated with an existing account.", new_user : true}, 400);
					}
				});
			});
		}, add_app = function (user_collection,app,user) {
			console.log('added new scopes');
			var crd = {};
			crd['data_' + app._id] = {user_scopes:app.basic_scopes};
			user_collection.update({_id:user._id}, {'$set':crd},function (err,d) {
				console.log(err);
				console.log(d);
			});
		}, find_app = function (err,req,res,data,cb) {
			db._instance().collection('app',function (err,_collection){
				if(err) {
					kiel.response(req, res, {data : err}, 500);
					return;
				}
				_collection.find({_id:data.app_id}).toArray(function (err,d){
					if(err) {
						kiel.response(req, res, {data : err}, 500);
						return;
					}

					if(d.length === 1) {
						try{
							cb(req,res,d[0],data);
						} catch (err) {
							kiel.response(req, res, {data : err}, 500);
						}
					} else {
						kiel.response(req, res, {data : "Application Id does not exists."}, 500);
					}
				});
			});
		}, save_request_token = function (req,res,r_token_object) {


			db._instance().collection('request_tokens',function (err,_collection) {
				if(err) {
					kiel.response(req, res, {data : err}, 500);
					return;
				}
				_collection.remove({user_id:r_token_object.user_id, app_id: r_token_object.app_id},function (err,dcs) {
					if (err) {
						kiel.response(req, res, {data : err}, 500);
						return;
					}
					_collection.insert(r_token_object, function (err) {
						if(err) { kiel.response(req, res, {data : err}, 500);return;}
						kiel.response(req, res, {request_token : r_token_object.request_token, expires : r_token_object.expires}, 200);
					});
				});
			});
		}, generate_request_token = function (req,res,app) {
			db._instance().collection('users',function (err,_collection){
				if(err) {
					kiel.response(req, res, {data : err}, 500);
					return;
				}
				_collection.find({_id:req.get_args.user_id}).toArray(function (err,d){
					if(err) {
						kiel.response(req, res, {data : err}, 500);
						return;
					}
					if(d.length > 0) {
						if(req.get_args.scope_token === kiel.utils.hash(req.get_args.app_id+'-'+app.secret)){
							try {
								var scps = [];
								//put trim on scopes here
								req.get_args.scopes.split(',').forEach(function (sc) {
									scps.push({scope: req.get_args.scope_token+'.'+sc.trim() });
								});

								// db._instance().collection('scopes',function (err,_collection) {
								// 	if(err) {
								// 		kiel.response(req, res, {data : err}, 500);
								// 		return;
								// 	}
								// 	_collection.find({$or:scps}).toArray(function (err,d){
								// 		if(err) {
								// 			kiel.response(req, res, {data : err}, 500);
								// 			return;
								// 		}
								// 		console.log(d);
								// 		console.log('-----------------');
								// 		console.log(scps);
								// 		if(d.length === scps.length) {
											var d = new Date();
											save_request_token(req,res,{request_token: kiel.utils.hash(d.getTime())+kiel.utils.random(),user_id: req.get_args.user_id,app_id:req.get_args.app_id,scopes:scps,created_at:d.getTime(),expires:d.getTime()+60*60*1000});
								// 		} else {
								// 			kiel.response(req, res, {data : "Error in validating scopes"}, 400);
								// 		}
								// 	});
								// });

							} catch (err){
								kiel.response(req, res, {data : "Error parsing scopes: "+err}, 500);
							}
						} else {
							kiel.response(req, res, {data : "Unauthorize request."}, 404);
						}
					} else {
						kiel.response(req, res, {data : "User does not exist."}, 404);
					}
				});
			});
		}, insert_access_token = function (req,res,request_token,_collection,ac) {
			var dt = new Date()
				, oauth_scopes = []
				, access_token = {
					user_id : req.get_args.user_id,
					app_id	: req.get_args.app_id,
					access_token : ac,
					expires : 0,
					created_at : dt.getTime()
				};

			request_token.scopes.forEach(function (sc) {
				oauth_scopes.push({_id:kiel.utils.hash(access_token.access_token+sc.scope),'access_token': access_token.access_token,'app_id':access_token.app_id, 'scope':sc.scope,'created_at':dt.getTime()});
			});
			console.log('INSERT SCOPES 1');
			console.log(oauth_scopes);
			console.log('================================');


			_collection.insert(access_token,function (err) {
				if(err) {
					kiel.response(req, res, {data : err}, 500);
					return;
				}
				db._instance().collection('request_tokens',function (err,_collection) {
					_collection.remove({request_token:request_token.request_token},function (err,d){
						if(err) {
							kiel.logger('Failed deleting request_token: '+request_token.request_token,'db_debug');
							return;
						}
						kiel.logger('Deleted request_token: '+request_token.request_token,'db_debug');
					})
				});
				db._instance().collection('oauth_session_scopes',function (err,_collection){
					if(err) {
						kiel.logger('Failed Loading the scopes for access_token: '+access_token.access_token,'db_debug');
						return;
					}
					_collection.insert(oauth_scopes,function (err){
						if(err) {
							kiel.logger('Failed saving oauth_scopes: '+access_token.access_token,'db_debug');
							return;
						}
					});
				});
				kiel.response(req, res, {access_token : access_token.access_token, expires:access_token.expires}, 200);
			});
		}, save_access_token = function (req, res, request_token) {
			db._instance().collection('access_tokens',function (err,_collection) {
				if(err) {kiel.response(req, res, {data : err}, 500);return;}
				_collection.find({user_id:req.get_args.user_id}).toArray(function (err,d) {
					if(err) {
						kiel.response(req, res, {data : err}, 500);
						return;
					}
					var dt = new Date()
						, ac = kiel.utils.hash(req.get_args.request_token + dt.getTime()) + kiel.utils.hash(req.get_args.user_id + kiel.utils.random());
					if(d.length === 0) {
						//if there are totally no access token for the user
						insert_access_token(req,res,request_token,_collection,ac);
					} else {
						var crd = null;
						for(var i=0; i<d.length;i++) {
							if(req.get_args.app_id === d[i].app_id) {
								crd = {};
								//stop at here
								crd['app_id'] = d[i].app_id;
								crd['access_token'] = d[i].access_token;
								break;
							}
						}
						if(crd === null) {
							//adds another application
							insert_access_token(req,res,request_token,_collection,ac);
						} else {
							var access_token_collection = _collection;
							db._instance().collection('oauth_session_scopes',function (err,_collection) {
								_collection.remove(crd,function (err,d) {
									if(err) {
										kiel.response(req, res, {data : err}, 500);
										return;
									}
									access_token_collection.remove(crd,function (err,d){
										if(err) {
											kiel.response(req, res, {data : err}, 500);
											return;
										}
										insert_access_token(req,res,request_token,access_token_collection,crd.access_token);
									});
								});
							});
						}
					}
				});
			});
		}, generate_access_token = function (req, res) {
			db._instance().collection('request_tokens', function (err,_collection) {
				if(err) {
					kiel.response(req, res, {data : err}, 500);
					return;
				}
				_collection.find({request_token:req.get_args.request_token}).toArray(function (err,d) {
					if(err) {
						kiel.response(req, res, {data : err}, 500);
						return;
					}
					var dt = new Date();
					/******TODO******/
					/*** Create a cron job to clear expired and unused request token ***/
					if(d.length !== 1 || d[0].app_id !== req.get_args.app_id || d[0].user_id !== req.get_args.user_id || d[0].expires <= dt.getTime()) {
						kiel.response(req, res, {data : "Invalid/Expired request token."}, 404);
						return;
					} else {
						save_access_token(req,res,d[0]);
					}

				});
			});
		}, add_scopes = function (req, res, app, data) {
			var scps = []
				, oauth_scopes = []
				, dt = new Date();


			// db._instance().collection('scopes',function (err,_collection) {
			// 	if(err) {
			// 		kiel.response(req, res, {data : err}, 500);
			// 		return;
			// 	}
			// 	_collection.find({$or:scps}).toArray(function (err,d){
			// 		if(err) {
			// 			kiel.response(req, res, {data : err}, 500);
			// 			return;
			// 		}
			// 		if(d.length === scps.length) {
			// 			var d = new Date();
			// 			save_request_token(req,res,{request_token: kiel.utils.hash(d.getTime())+kiel.utils.random(),user_id: req.get_args.user_id,app_id:req.get_args.app_id,scopes:scps,created_at:d.getTime(),expires:d.getTime()+60*60*1000});
			// 		} else {
			// 			kiel.response(req, res, {data : "Error in validating scopes"}, 400);
			// 		}
			// 	});
			// });
			// add this code later once we have complete set of scopes

			(data.scopes.split(',')).forEach(function (sc) {
				if(sc.trim() !== '')
					scps.push({scope: app.scope_token+'.'+sc.trim() });
			});
			scps.forEach(function (sc) {
				oauth_scopes.push({_id:kiel.utils.hash(data.access_token+sc.scope),'access_token': data.access_token,'app_id':data.app_id, 'scope':sc.scope,'created_at':dt.getTime()});
			});
			console.log('INSERT SCOPES 2');
			console.log(oauth_scopes);
			console.log('================================');
			db._instance().collection('oauth_session_scopes',function (err,_collection){
				if(err) { kiel.response(req, res, {data : "Something went wrong while adding scopes:"+err}, 500);return;}
				_collection.insert(oauth_scopes,{continueOnError: true, safe: true},function (err){
					// if(err) { kiel.response(req, res, {data:'Failed saving oauth_scopes: '+err},500);return;}
					kiel.response(req, res, {data:data,scopes_added:scps},200);
					return;
				});
			});
		},
		check_email = function (req, res, app, data) {
			var inst = {};

			db._instance().collection('users',function (err, _collection){
				if(err){ kiel.response(req, res, {data : err}, 500); return; }

				_collection.find({email: data.email}).toArray(function (e, _data){
					if(err){ kiel.response(req, res, {data : e}, 500); return; }

					if (_data.length === 0) {
						kiel.response(req, res, {data: "The email does not belong to an account."}, 500); return;
					} else {
						inst.token = kiel.utils.hash(new Date().getTime()) + '-' + kiel.utils.hash(_data[0].email) + '-' + kiel.utils.hash('reset_password');
						inst.email = _data[0].email;
						inst.user_id = _data[0]._id;
						inst.expires = new Date().getTime() + (1 * 24 * 60 * 60 * 1000);
						inst.valid = 1;

						console.log(inst);

						db._instance().collection('password_reset_tokens', function (e, prt_collection) {

							prt_collection.insert(inst, function (err) {
								if(err) { kiel.response(req, res, {data : err}, 500);return;}
								kiel.response(req, res, inst, 200);
							});
						});
					}
				});
			});
		},
		password_reset = function (req, res, app, data){
			var u_id;
			db._instance().collection('users',function (err, _collection){
				if(err){ kiel.response(req, res, {data : err}, 500); return; }

				_collection.find({email: data.email}).toArray(function (e, _data){
					if(err){ kiel.response(req, res, {data : e}, 500); return; }

					if (_data.length === 0) {
						kiel.response(req, res, {data: "The email does not belong to an account."}, 500); return;
					} else {

						db._instance().collection('password_reset_tokens', function (e, prt_collection) {

							prt_collection.find({email: data.email, valid: 1, token: data.reset_token, expires : {$gte: new Date().getTime()}}).
								sort({expires: -1}).
								toArray(function (err, prt_data) {
									if (err) { kiel.response(req, res, {data : err}, 500);return;}

									if (prt_data.length < 1 && _data[0].pfl === 'internal') {
										kiel.response(req, res, {data : "Invalid or expired token."}, 500);
										return;
									}
									console.log(data.password);
									console.log(kiel.utils.hash( kiel.utils.hash(data.password) + kiel.application_config.salt));
									console.log(prt_data);

									u_id = prt_data[0] ? prt_data[0].user_id : _data[0]._id;
									console.log('----user_id=====');
									console.log(u_id);
									console.log(prt_data[0]);
									console.log(_data[0]);

									db._instance().collection('users',function (err, u_collection){
										u_collection.update({_id: u_id}, {$set: {pfl: 'internal', password: kiel.utils.hash( kiel.utils.hash(data.password) + kiel.application_config.salt)  } }, function (ers, u_data) {
											if (err) { kiel.response(req, res, {data : err}, 500);return;}
											if (u_data.data < 1) {
												return kiel.response(req, res, {data : "Something went wrong."}, 500);
											}
											console.log(u_data);
											prt_collection.update({email: data.email, valid: 1}, {$set: {valid: 0}}, {multi: true}, function (err, d) {
												if(err) { kiel.response(req, res, {data : err}, 500);return;}
												return kiel.response(req, res, {data : d}, 200);
											});
										});
									});

							});
						});
					}
				});
			});

		},
        encrypt = function (algo, secret, toEnc) {
            var cipher = crypto.createCipher(algo, secret),
                crypted = cipher.update(toEnc, 'utf8', 'hex');

            crypted += cipher.final('hex');

            return crypted;
        },
        decrypt = function (algo, secret, toDec) {
            var decipher = crypto.createDecipher(algo, secret),
                decrypted = decipher.update(toDec, 'hex', 'utf8');

            decrypted += decipher.final('utf8');

            return decrypted;
        },
        find_id = function(req, res, app_data, post_data) {
            var tmp = {},
                algo = 'aes-256-ctr',
                pass = 'epNIr9d2h0Ns_xM';

            db._instance().collection('users', function (err, users) {
                if (err) {
                    kiel.response(req, res, {data : err} , 500);
                    return;
                }

                users.find({ email : post_data.email}).toArray(function (err, data) {

                    if (err) {
                        kiel.response (req, res, { data : err}, 500);
                        return;
                    }
                    if (data.length === 1) {
                        tmp = {
                            timestamp : +new Date,
                            _id : data[0]._id,
                            email : data[0].email,
                            username : data[0].username,
                            profile_info : data[0].profile_info,
                            contact_info : data[0].contact_info
                        };

                        data = encrypt(algo, pass, JSON.stringify(tmp));

                        return kiel.response(req, res,  {data : data}, 200);
                    } else if (data.length > 1) {
                        tmp = {
                            message : "Multiple account was found. Freedom! user but data is currently faulty."
                        };

                        data = encrypt(algo, pass, JSON.stringify(tmp));

                        return kiel.response(req, res, {data : data}, 409)
                    } else {
                        tmp = {
                            message : "Not a Freedom! user"
                        };

                        data = encrypt(algo, pass, JSON.stringify(tmp));

                        return kiel.response(req, res, { data : data}, 404)
                    }

                })
            });
        },
        login_position = function (req, res, app_data, post_data) {
            var scopes = app_data.basic_scopes.join(),
                login_post;

            if (post_data.source === "position_music") {
                login_post = {
                        app_id : app_data._id,
                        source : post_data.source,
                        email : post_data.email,
                        password : post_data.password
                    };
            } else if (post_data.source === "google") {
                login_post = {
                        app_id : app_data._id,
                        source : post_data.source,
                        email : post_data.email,
                        google_access_token : post_data.access_token
                    };
            } else {
                return kiel.response(req, res, { data : 'invalid source'})
            }

            curl.post('http://localhost:3000/auth/login', { form : login_post} ,function (err, resp, body) {
                var json;

                if (err) {
                    return kiel.response(req, res, { data: res.message}, 400);
                }

                json = JSON.parse(body);

                if (resp.statusCode !== 200) {
                    return kiel.response(req, res, { data: json.data}, 400);
                }

                curl('http://localhost:3000/auth/request_token?user_id='+json.user_data._id+'&scope_token='+app_data.scope_token+'&scopes='+scopes+'&app_id='+post_data.app_id, function (_err, _response, _body) {
                    var _json;
                    if (_err) {
                        return kiel.response(req, res, { data: _err.message}, 400);
                    }

                    _json = JSON.parse(_body);

                    if (_response.statusCode !== 200) {
                        return kiel.response(req, res, { data: _json.data}, 400);
                    }

                    curl('http://localhost:3000/auth/access_token?user_id='+json.user_data._id+'&app_id='+post_data.app_id+'&request_token='+_json.request_token, function ( __err, __response, __body) {
                        var __json,
                            return_data,
                            algo = 'aes-256-ctr',
                            pwd = 'epNIr9d2h0Ns_xM';

                        if (__err) {
                            return kiel.response(req, res, { data: __err.message}, 400);
                        }

                        return_data = encrypt(algo, pwd, __body);
                        __json = JSON.parse(__body);

                        if (__response.statusCode !== 200) {
                            return kiel.response(req, res, { data: _json.data}, 400);
                        }

                        return kiel.response(req, res, { data : return_data }, 200);
                    });

                });

            });
        };

	return {
		get : {
			import : function (req, res) {
				db.imports(null,['users','app','scopes']);
				kiel.response(req, res, {data : "Import process started. See logs and server message"}, 200);
				// kiel.response(req, res, {data : kiel.utils.hash('831e4ee9529422134b4a010611601adf-beaa4de45f5461ce8f638e76f48dd3c5')}, 200);

			} ,
			random : function (req, res){
				p='';
				h = kiel.utils.hash('applicaion'+kiel.application_config.salt+new Date()+kiel.utils.random());
				if(req.get_args.pass){
					p = kiel.utils.hash(kiel.utils.hash(req.get_args.pass) + kiel.application_config.salt);
				}
				kiel.response(req, res, {data :h, date: new Date().getTime(),pass:p}, 200);
			} ,
			request_token : function (req, res) {
				var rqrd = ['app_id','scopes','user_id','scope_token']
					, rst;
				if(!(rst = kiel.utils.required_fields(rqrd,req.get_args)).stat){
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}
				find_app(null,req,res,req.get_args,generate_request_token);
			} ,
			access_token : function (req, res) {
				var rqrd = ['app_id','request_token','user_id']
					, rst;
				if(!(rst = kiel.utils.required_fields(rqrd,req.get_args)).stat){
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}
				generate_access_token(req, res);
			} ,
			has_scopes : function (req, res) {
				var rqrd = ['access_token','scopes'],
					scps = [];

				(req.get_args.scopes.split(',')).forEach(function (sc) {
					scps.push(sc.trim());
				});

				kiel.utils.has_scopes(scps, null, req.get_args.access_token, function (err,d){
					if(err){ kiel.response(req, res, {data : err.message}, err.response_code); return; }

					kiel.response(req, res, {data : "Success"}, 200);
					return;

				});
			},
            encrypt : function (text) {

            },
            decrypt : function (hash, key) {

            }
		},

		post : {
			login : function (req, res) {
				var rqrd = ['app_id','source']
					, rst;
				if(!(rst = kiel.utils.required_fields(rqrd,req.post_args)).stat){
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}
				if (!req.post_args.email && !req.post_args.username ) {
					kiel.response(req, res, {data : "Missing username or email "}, 500);
					return;
				}
				find_app(null,req,res,req.post_args,login_check);
			},
			logout : function (req, res) {
				var rqrd = ['access_token','app_id']
					, rst;
				if(!(rst = kiel.utils.required_fields(rqrd,req.post_args)).stat){
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}
				db._instance().collection('access_tokens',function (err,_collection) {
					if(err) {kiel.response(req, res, {data : err}, 500);return;}
					_collection.remove({access_token:req.post_args.access_token}, function (err,d) {
						if(err) {kiel.response(req, res, {data : err}, 500);return;}
						db._instance().collection('oauth_session_scopes',function (err,_collection) {
							_collection.remove({access_token:req.post_args.access_token}, function (err,d) {
							});
						});
						kiel.response(req, res, {logged_out:true}, 200);
					});
				});
			},
			generate_reset_token : function (req, res) {
				var rqrd = 	['app_id', 'email'],
					rst;
				if(!(rst = kiel.utils.required_fields(rqrd, req.post_args)).stat){
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}
				find_app(null, req, res, req.post_args, check_email);
			},
			reset_password : function (req, res) {
				var rqrd = 	['app_id', 'email', 'reset_token', 'password'],
					rst;
				if(!(rst = kiel.utils.required_fields(rqrd, req.post_args)).stat){
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}
				if (req.post_args.password.length < 10) {
					return kiel.response(req, res, {data: "Password must be atleast 10 characters long."}, 500);
				}
				find_app(null, req, res, req.post_args, password_reset);
			},
            position : function (req, res) {
                var rqrd = ['data'],
                    algo = 'aes-256-ctr',
                    pwd = 'epNIr9d2h0Ns_xM',
                    data, post_data;

				if(!(rst = kiel.utils.required_fields(rqrd, req.post_args)).stat){
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}

                try{
                    post_data = decrypt(algo, pwd, req.post_args.data);
                } catch (e) {
                    return kiel.response(req, res, {data: e.message}, 400);
                }

                try {
                    data = qs.parse(post_data);
                }
                catch(e) {
                    return kiel.response(req, res, {data: e.message}, 400);
                }

				if(!(rst = kiel.utils.required_fields(['app_id', 'email', 'auth', 'source'], data)).stat){
					return kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 406);
				}

                data.auth = data.auth === 'true';
                req.post_args.source = data.source

                console.log(data);

                if (!data.auth && data.source === 'position_music') {
                    console.log('find_id only')
                    find_app(null, req, res, data, find_id);
                } else if (data.auth) {
                    if (data.source === 'position_music') {
                        console.log('login using username and password');

                        if(!(rst = kiel.utils.required_fields(['password'], data)).stat){
                            return kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 406);
                        }

                        req.post_args.email = data.email;
                        req.post_args.password = data.password;
                        req.post_args.source = data.source;
                    } else if (data.source === 'google') {
                        console.log('login using google');

                        if(!(rst = kiel.utils.required_fields(['access_token'], data)).stat){
                            return kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 406);
                        }

                        req.post_args.email = data.email;
                        req.post_args.google_access_token = data.access_token;
                    } else {
                        return kiel.response(req, res, { data : 'invalid source '+data.source }, 400);
                    }

                    return find_app(null, req, res, data, login_position);
                } else {
                    return kiel.response(req, res, { data : "invalid auth"}, 406);
                }
            }
		},

		put : {
			add_self_scopes : function (req, res) {
				var rqrd = ['access_token','user_id','scopes']
					, rst
					, scopes = ['self.edit'];
				if(!(rst = kiel.utils.required_fields(rqrd,req.put_args)).stat){
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}
				kiel.utils.has_scopes(scopes, null, req.put_args.access_token, function (err,d){
					if(err){ kiel.response(req, res, {data : err.message}, err.response_code); return; }
					if(req.put_args.user_id !== d.user_id) {
						kiel.response(req, res, {data : "Invalid user_id for access_token!"}, 404);
						return;
					}
					d['scopes'] = req.put_args.scopes;
					find_app(null,req,res,d,add_scopes);
				});

			} ,
			add_scopes : function (req, res) {
				var rqrd = ['access_token','user_id','scopes']
					, rst
					, scopes = ['admin.edit_all'];
				if(!(rst = kiel.utils.required_fields(rqrd,req.put_args)).stat){
					kiel.response(req, res, {data : "Missing fields ["+rst.field+']'}, 500);
					return;
				}
				kiel.utils.has_scopes(scopes, null, req.put_args.access_token, function (err,d){
					if(err){ kiel.response(req, res, {data : err.message}, err.response_code); return; }
					if(!d) {
						kiel.response(req, res, {data : "Invalid user_id for access_token!"}, 404);
						return;
					}
					d['scopes'] = req.put_args.scopes;
					find_app(null,req,res,d,add_scopes);
				});

			} ,
			admin_add_scopes : function (req, res) {
				// kiel.utils.has_scopes(scopes,req.get_args.access_token,function (err,d){

				// });
			}
		},

		delete : {

		}
	}
}

module.exports = auth;
