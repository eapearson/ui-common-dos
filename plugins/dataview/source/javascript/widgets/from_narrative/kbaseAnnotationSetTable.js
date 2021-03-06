/**
 * KBase widget to display table and boxplot of BIOM data
 */
/*global
 define
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'jquery',
    'kb.runtime',
    'kb.html',
    'kb.service.workspace',
    'kb.jquery.authenticatedwidget',
    'datatables_bootstrap'
],
    function ($, R, html, Workspace) {
        'use strict';
        $.KBWidget({
            name: 'AnnotationSetTable',
            parent: "kbaseAuthenticatedWidget",
            version: '1.0.0',
            token: null,
            options: {
                id: null,
                ws: null
            },
            init: function (options) {
                this._super(options);
                this.ws_url = R.getConfig('services.workspace.url');
                return this;
            },
            render: function () {
                var self = this;
                var container = this.$elem;
                container.empty();
                if (self.token === null) {
                    container.append("<div>[Error] You're not logged in</div>");
                    return;
                }
                container.append(html.loading('loading data...'));

                var kbws = new Workspace(self.ws_url, {'token': self.token});
                kbws.get_objects([{ref: self.options.ws + "/" + self.options.id}], function (data) {
                    container.empty();
                    // parse data
                    if (data.length === 0) {
                        //var msg = "[Error] Object "+self.options.id+" does not exist in workspace "+self.options.ws;

                        // We are moving away from "workspace"
                        var msg = "[Error] Object " + self.options.id + " can not be found";
                        container.append('<div><p>' + msg + '>/p></div>');
                    } else {
                        var otus = data[0].data.otus,
                            columns = ['features', 'functional role', 'abundance', 'avg e-value', 'otu'],
                            rows = [],
                            o, funcs, f;
                        for (o = 0; o < otus.length; o += 1) {
                            funcs = otus[o].functions;
                            for (f = 0; f < funcs.length; f += 1) {
                                rows.push([
                                    funcs[f].reference_genes.join("<br>"),
                                    funcs[f].functional_role,
                                    funcs[f].abundance,
                                    funcs[f].confidence,
                                    otus[o].name
                                ]);
                            }
                        }

                        // container.append('<div id="annotationTable' + tableId + '" style="width: 95%;"></div>');
                        var options = {
                            class: 'table table-striped'
                        };
                        var table = html.makeTable(columns, rows, options);
                        container.html(table);
                        $('#' + options.generated.id).dataTable();

                        /*
                         * var tlen = 0;
                         if (window.hasOwnProperty('rendererTable') && rendererTable.length) {
                         tlen = rendererTable.length;
                         }
                         var tableAnn = standaloneTable.create({index: tlen});
                         tableAnn.settings.target = document.getElementById("annotationTable" + tlen);
                         tableAnn.settings.data = {header: cnames, data: tdata};
                         tableAnn.settings.filter = {1: {type: "text"}};
                         var mw = [120];
                         for (var i = 1; i < cnames.length; i++) {
                         mw.push(130);
                         }
                         tableAnn.settings.minwidths = mw;
                         tableAnn.render(tlen);
                         */
                    }
                }, function (data) {
                    container.empty();
                    var main = $('<div>');
                    main.append($('<p>')
                        .css({'padding': '10px 20px'})
                        .text('[Error] ' + data.error.message));
                    container.append(main);
                });
                return self;
            },
            loggedInCallback: function (event, auth) {
                this.token = auth.token;
                this.render();
                return this;
            },
            loggedOutCallback: function (event, auth) {
                this.token = null;
                this.render();
                return this;
            }
        });
    });
