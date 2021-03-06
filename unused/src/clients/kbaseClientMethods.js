define([
    'q', 
    'kb.runtime',
    'kb.utils', 
    'kb.utils.api', 
    'kb.service.workspace', 
    'kb.service.user_profile', 
    'kb.service.narrative_method_store'
],
   function (Q, R, Utils, APIUtils, Workspace, UserProfile, NarrativeMethodStore) {

      return Object.create({}, {
         init: {
            value: function (cfg) {
               if (R.hasConfig('services.workspace.url')) {
                  this.workspaceClient = new Workspace(R.getConfig('services.workspace.url'), {
                     token: R.getAuthToken()
                  });
               } else {
                  throw 'The workspace client url is not defined';
               }
               if (R.hasConfig('services.user_profile.url')) {
                  this.userProfileClient = new UserProfile(R.getConfig('services.user_profile.url'), {
                     token: R.getAuthToken()
                  });
               } else {
                  throw 'The user profile client url is not defined';
               }
               if (R.hasConfig('services.narrative_method_store.url')) {
                  this.narrativeMethodStoreClient = new NarrativeMethodStore(R.getConfig('services.narrative_method_store.url'), {
                     token: R.getAuthToken()
                  });
               } else {
                  throw 'The narrative method store client url is not defined';
               }
               return this;
            }
         },

         isValidNarrative: {
            value: function (ws) {
               if (ws.metadata.narrative &&
                  // corrupt workspaces may have narrative set to something other than the object id of the narrative
                  /^\d+$/.test(ws.metadata.narrative) &&
                  ws.metadata.is_temporary !== 'true') {
                  return true;
               } else {
                  return false;
               }
            }
         },

         applyNarrativeFilter: {
            value: function (ws, filter) {
               return true;
            }
         },

         getNarratives: {
            value: function (cfg) {
               // get all the narratives the user can see.
               return Q.promise(function (resolve, reject, notify) {
                  Utils.promise(this.workspaceClient, 'list_workspace_info', cfg.params)
                     .then(function (data) {
                        var workspaces = [];
                        for (var i = 0; i < data.length; i++) {
                           var wsInfo = APIUtils.workspace_metadata_to_object(data[i]);
                           if (this.isValidNarrative(wsInfo) && this.applyNarrativeFilter(cfg.filter)) {
                              workspaces.push(wsInfo);
                           }
                        }

                        var objectRefs = workspaces.map(function (w) {
                           return {
                              ref: w.id + '/' + w.metadata.narrative
                           }
                        });
                     
                     if (objectRefs.length === 0) {
                        resolve([]);
                        return;
                     }

                        // Now get the corresponding object metadata for each narrative workspace
                        Utils.promise(this.workspaceClient, 'get_object_info_new', {
                              objects: objectRefs,
                              ignoreErrors: 1,
                              includeMetadata: 1
                           })
                           .then(function (data) {
                              var narratives = [];
                              for (var i = 0; i < data.length; i++) {
                                 // If one of the object ids from the workspace metadata (.narrative) did not actually
                                 // result in a hit, skip it. This can occur if a narrative is corrupt -- the narrative object
                                 // was deleted or replaced and the workspace metadata not updated.
                                 if (!data[i]) {
                                    //console.log('WARNING: workspace ' + object.wsid + ' does not contain a matching narrative object');
                                    continue;
                                 }
                                 // Make sure it is a valid narrative object.
                                 var object = APIUtils.object_info_to_object(data[i]);
                                 if (object.typeName !== 'Narrative') {
                                    //console.log('WARNING: workspace ' + object.wsid + ' object ' + object.id + ' is not a valid Narrative object');
                                    continue;
                                 }
                                 
                                 // Convert some narrative-specific metadata properties.
                                 //console.log('META');
                                 //console.log(object.metadata);
                                 if (object.metadata && object.metadata.job_info) { 
                                    object.metadata.jobInfo = JSON.parse(object.metadata.job_info);
                                 }
                                 if (object.metadata && object.metadata.methods) {
                                    //console.log('HERE');
                                    object.metadata.cellInfo = JSON.parse(object.metadata.methods);
                                 }
                                 
                                 narratives.push({
                                    workspace: workspaces[i],
                                    object: object
                                 });
                              }
                              resolve(narratives);
                           }.bind(this))
                           .catch(function (err) {
                              reject(err);
                           })
                           .done();
                     }.bind(this))
                     .catch(function (err) {
                        reject(err);
                     })
                     .done();
               }.bind(this));
            }
         },

         getPermissions: {
            value: function (narratives) {
               return Q.promise(function (resolve, reject, notify) {
                  if (narratives.length === 0) {
                     resolve([]);
                     return;
                  }
                  var promises = narratives.map(function (narrative) {
                     return Utils.promise(this.workspaceClient, 'get_permissions', {
                        id: narrative.workspace.id
                     })
                  }.bind(this));
                  var username = R.getUsername();
                  Q.all(promises)
                     .then(function (permissions) {
                        for (var i = 0; i < permissions.length; i++) {
                           var narrative = narratives[i];
                           narrative.permissions = Utils.object_to_array(permissions[i], 'username', 'permission')
                              .filter(function (x) {
                                 if (x.username === username ||
                                    x.username === '*' ||
                                    x.username === narrative.workspace.owner) {
                                    return false;
                                 } else {
                                    return true;
                                 }
                              })
                              .sort(function (a, b) {
                                 if (a.username < b.username) {
                                    return -1;
                                 } else if (a.username > b.username) {
                                    return 1;
                                 } else {
                                    return 0
                                 }
                              });
                        }
                        resolve(narratives);
                     }.bind(this))
                     .catch(function (err) {
                        reject(err);
                     })
                     .done();
               }.bind(this));
            }
         },
         
         getApps: {
            value: function () {
               return Utils.promise(this.narrativeMethodStoreClient, 'list_apps', {});
            }
         },
         
         getMethods: {
            value: function () {
               return Utils.promise(this.narrativeMethodStoreClient, 'list_methods', {});
            }
         },
         
         getCollaborators: {
            value: function (options) {
               var users = (options && options.users)?options.users:[];
               users.push(R.getUsername());
               return Q.promise(function (resolve, reject, notify) {
                  this.getNarratives({
                        params: {
                           excludeGlobal: 1
                        }
                     })
                     .then(function (narratives) {
                        this.getPermissions(narratives)
                           .then(function (narratives) {
                              var collaborators = {};
                              // var currentUser = R.getUsername();
                              
                              for (var i = 0; i < narratives.length; i++) {
                                 // make sure logged in user is here
                                 // make sure subject user is here
                                 // I hate this crud, but there ain't no generic array search.
                                 var perms = narratives[i].permissions;
                                 
                                 
                                 // make sure all users are either owner or in the permissions list.
                                 var pass = true;
                                 if (_.some(users, function (user) {
                                    if (narratives[i].workspace.owner === user ||
                                        _.find(perms, function (x) {return x.username === user})) {
                                       return false;
                                    } else {
                                       return true;
                                    }
                                 })) {
                                    continue;
                                 }
                                 
                                 // Remove participants and the public user.
                                 var perms = perms.filter(function (x) {
                                    if (_.contains(users, x.username) ||
                                       x.username === '*') {
                                       return false;
                                    } else {
                                       return true;
                                    }
                                 });
                                 
                                 // And what is left are all the users who are collaborating on this same narrative.
                                 // okay, now we have a list of all OTHER people sharing in this narrative.
                                 // All of these folks are common collaborators.
                                 perms.forEach(function (x) {
                                    Utils.incrProp(collaborators, x.username)
                                 });
                              }
                              var collabs = Utils.object_to_array(collaborators, 'username', 'count');
                              var usersToFetch = collabs.map(function (x) {
                                 return x.username
                              });
                              Utils.promise(this.userProfileClient, 'get_user_profile', usersToFetch)
                                 .then(function (data) {
                                    try {
                                       for (var i = 0; i < data.length; i++) {
                                          // it is possible that a newly registered user, not even having a stub profile,
                                          // are in this list?? If so, remove that user from the network.
                                          // TODO: we need a way to report these cases -- they should not occur or be very rare.
                                          if (!data[i] || !data[i].user) {
                                             console.log('WARNING: user ' + usersToFetch[i] + ' is a sharing partner but has no profile.');
                                             // this.logWarning('collaboratorNetwork', 'user ' + collaboratorUsers[i] + ' is a sharing partner but has no profile.');
                                          } else {
                                             collabs[i].realname = data[i].user.realname;
                                          }
                                       }
                                       collabs = collabs.filter(function (x) {
                                          return (x.realname ? true : false)
                                       });
                                       resolve(collabs);
                                    } catch (ex) {
                                       console.log('EX:');
                                       console.log(ex);
                                       reject(ex);
                                    }
                                 }.bind(this))
                                 .catch(function (err) {
                                    reject(err);
                                 })
                                 .done();
                           }.bind(this))
                           .catch(function (err) {
                              reject(err);
                           })
                           .done();
                     }.bind(this))
                     .catch(function (err) {
                        reject(err);
                     });
               }.bind(this));
            }
         },
      });


   });