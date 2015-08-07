# Error Handling

Types of errors:

- errors: unexpected, blocks some functionality
- warning: some inconsistency which might lead to unexpected results
- info: notes inserted into code, primarily for debugging or monitoring

Locations:

- panel: stops a panel from operating
- widget: stops a panel from operating
- app: stops a panel from operationg
- service: some ui service has had a problem
- 3rd party: out of our control, but may appear in the browser console.



UI components: 

- log viewer -- a pop-up which shows a sortable, searchable view of the most recent N log entries
- nav bar -- controls which light up when there are > 0 errors, warnings, info
- error panel - a panel level error which shows an error generated by a panel
- error widget - a widget level error which shows an error generated by a widget
