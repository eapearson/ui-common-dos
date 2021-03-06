/*global
 define, require
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'jquery',
    'q',
    'kb.runtime',
    'kb.html',
    'kb.service.workspace',
    'kb_types',
    'datatables_bootstrap'
], function ($, q, R, html, Workspace, Types) {
    'use strict';

    function widget() {
        var mount, container, $container;

        var tableId;

        function renderer() {
            return q.Promise(function (resolve, reject) {
                var workspace = new Workspace(R.getConfig('services.workspace.url'), {
                    token: R.getAuthToken()
                });
                var a = html.tag('a');
                q(workspace.list_all_types({
                    with_empty_modules: 1
                }))
                    .then(function (data) {
                        // Flatt out the types.
                        // var rows = [];
                        var typeRecords = {};
                        var getinfo = [];
                        Object.keys(data).forEach(function (moduleName) {
                            var types = data[moduleName];
                            Object.keys(types).forEach(function (typeName) {
                                var typeId = moduleName + '.' + typeName + '-' + types[typeName];
                                //rows.push([
                                //    moduleName, typeName, a({href: '#spec/type/' + typeId}, types[typeName])
                                //]);
                                typeRecords[typeId] = {
                                    id: typeId,
                                    module: moduleName,
                                    type: typeName,
                                    version: types[typeName]
                                };
                                getinfo.push(q(workspace.get_type_info(typeId)));
                            });
                        });

                        q.all(getinfo)
                            .then(function (results) {
                                results.forEach(function (result) {
                                    // console.log(result);
                                    var typeId = result.type_def;
                                    typeRecords[typeId].info = result;
                                });
                                tableId = html.genId()
                                var rows = Object.keys(typeRecords).map(function (typeId) {
                                    var type = typeRecords[typeId];
                                    return [
                                        type.module, type.type,
                                        Types.getIcon({
                                            module: type.module,
                                            type: type.type,
                                            size: 'medium'
                                        }).html,
                                        a({href: '#spec/type/' + type.id}, type.version),
                                        type.info.using_type_defs.map(function (typeId) {
                                            return a({href: '#spec/type/' + typeId}, typeId);
                                        }).join('<br>'),
                                        type.info.used_type_defs.map(function (typeId) {
                                            return a({href: '#spec/type/' + typeId}, typeId);
                                        }).join('<br>'),
                                        type.info.using_func_defs.map(function (functionId) {
                                            return a({href: '#spec/functions/' + functionId}, functionId);
                                        }).join('<br>')

                                    ];
                                }),
                                    cols = ['Module', 'Type', 'Icon', 'Version', 'Using types', 'Used by types', 'Used by functions'],
                                    result = html.makeTable(cols, rows, {id: tableId, class: 'table table-striped'});
                                resolve({
                                    title: 'Type Browser',
                                    content: result,
                                    children: []
                                });
                            })
                            .catch(function (err) {
                                console.log('ERROR getting type info');
                                console.log(err);
                                reject({
                                    title: 'Error',
                                    content: 'Error getting type info'
                                });
                            })
                            .done();
                    })
                    .catch(function (err) {
                        console.log('ERROR');
                        console.log(err);
                    })
                    .done();
            });
        }

        function attachDatatable() {
            console.log('attaching datatable ...');
            console.log(tableId);
            $('#' + tableId).dataTable({
                initComplete: function (settings) {
                    var api = this.api(),
                        rowCount = api.data().length,
                        pageSize = api.page.len(),
                        wrapper = api.settings()[0].nTableWrapper;
                    if (rowCount <= pageSize) {
                        $(wrapper).find('.dataTables_paginate').closest('.row').hide();
                        $(wrapper).find('.dataTables_filter').closest('.row').hide();
                    }
                    $(settings.nTable).removeClass('hide');
                }
            });
        }

        // API
        function init(config) {
            return q.Promise(function (resolve) {
                resolve();
            });
        }

        function attach(node) {
            return q.Promise(function (resolve, reject) {
                mount = node;
                container = document.createElement('div');
                $container = $(container);
                mount.appendChild(container);

                container.innerHTML = 'Loading all KBase Types ...' + html.loading();

                renderer()
                    .then(function (rendered) {
                        container.innerHTML = rendered.content;
                        R.send('app', 'title', rendered.title);

                        attachDatatable();
                        // create widgets.
                        // no children for now (see kbaseSimplePanel for how to do this)
                        resolve();
                    })
                    .catch(function (err) {
                        if (err.title) {
                            container.innerHTML = err.content;
                            R.send('app', 'title', err.title);
                        }
                        console.log('ERROR rendering widget');
                        console.log(err);
                        reject(err);
                    })
                    .done();
            });
        }

        function start(params) {
            return q.Promise(function (resolve, reject) {
                resolve();
            });
        }
        function stop() {
            return q.Promise(function (resolve, reject) {
                resolve();
            });
        }
        function detach() {
            return q.Promise(function (resolve, reject) {
                resolve();
            });
        }
        return {
            init: init,
            attach: attach,
            start: start,
            stop: stop,
            detach: detach
        };
    }

    return {
        make: function () {
            return widget();
        }
    };

});