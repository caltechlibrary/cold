
# Action Items

## Bugs

## Next

- [ ] Figure out if I need refactor people, groups, funders to tease out the type definitions (i.e. interface and class) into 
    - [ ] Review https://jsr.io/@deno/emit, this is probably the right choice for the project but not certain, need to figure out how clean a "compile to single JS file" I can get
    - Looks like the "bundle" command line compile option in deno maybe helpful here, see `deno --help bundle`
        - Looks like "bundle" is depreciated, see https://docs.deno.com/runtime/manual/tools/bundler/
        - [ ] Review https://esbuild.github.io/
        - [ ] Review https://rollupjs.org/
- [X] Figure out how switching from a read view to an edit view should work (e.g. URL parameter like `view=...` or do I expanded URL end points?). The problem is keeping the URL end points managable while still maintaining a simple implementation. I POST can be used to submit form to the same URL as the edit view is, edit view would use GET to retrieve the populated form. 
- [X] Figure out if Mustache templates are enough to support UI. If not then find an alternative quickly
    - switched to Handlebars
- [X] refactor modules for people and groups so that the web configuration like base\_url can flow through the app. This could be done by making a app\_group and app\_people object that held the various handlers. It could also be done through the config module exposing global values. Not sure right approach.
    - fixed by adopting relative linking throughout templates
- [X] Figure out how to render TypeScript to JavaScript for browser side interactivity if there is time to implement that
    - See https://rsdoiel.github.io/blog/2024/07/03/transpiling_with_deno.html
- [ ] Update UI labeling based on RDM project meeting suggestions, see https://caltechlibrary.atlassian.net/wiki/spaces/InvenioMigration/pages/3282960385/2024-08-13+Project+Team+Meeting+Notes
- [ ] Make sure `author_id` and `thesis_id` continue to be mapped on reloading data from CSV file, if a person has an "clpid" and only are alumni then that should go into the `thesis_id` field.
- [ ] Make sure we auto tag `include_in_feeds` based on current algorithms on importing data
