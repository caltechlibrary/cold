
[COLD](https://github.com/caltechlibrary/cold "This is the GitHub location for the COLD application") is an application that Caltech Library uses to manage collections of controlled vocabularies and objects. The backend is built on [dataset](https://caltechlibrary.github.io/dataset)'s web service called [datasetd](https://github.com/caltechlibrary/dataset "This is the GitHub repository holding the Go based dataset and datasetd applications"). The datasetd web service provides a simple JSON API documented at <https://caltechlibrary.github.io/dataset/datasetd.1.html> and <https://caltechlibrary.github.io/dataset/datasetd_api.5.html>. Go code implementation can be found here, <https://github.com/caltechlibrary/dataset/> in the files api.go, api_routes.go.  The behavior of COLD's isntance of datasetd is defined in the COLD repository's cold_api.yaml file.

There is a middle ware written in Deno+TypeScript. It is in the COLD GitHub repository. It provides a simplified version of the datasetd API to the web browser proxied by a front end web server which controls access (example Apache2 + Shibboleth). In develop you can just work with the middleware directly as it also provides access to static resources found in the htdocs directory of the COLD repository. The JavaScript modules used browser side by COLD are written and maintained in TypeScript. These are transpiled or bundled into the JavaScript files found in htdocs/modules. The middleware also handles translating Handlebars templates found in the view directory. These are used to format lists of people, groups, funders and the reports page. The newer parts of COLD are implementing the front end as a Markdown page in htdocs that gets rendered as HTML in the htdocs directory. These pull in UI defined by TypeScript that has been transpiled to JavaScript module found in htdocs/modules.

There is also a reports module in COLD. This is a blend of middleware and a seperate COLD reports service implemented in Deno+TypeScript.

The Deno+TypeScript services are compiled to native code when used in a production setting.

# Separation of concerns

The COLD application architecture is built around a separation of concerns with each layer responsible for specific functionality. The browser is where the UI runs. The front end web service (Apache2 + Shibboleth) provides single sign-on and controls access. The COLD provided middleware validates inputs and provides application functionality bridging the front end and back end.  The backend is responsible for data persistance via dataset collection, a defined list of queries per dataset collection and basic CRUD operations where appropriate.

# Development phylosophy

Limit 3rd party dependencies and use standard libraries when possible. Front end should be vanilla HTML5, vanilla CSS and vanilla JavaScript. I prefer simple clear solutions to make software maintenance more sustainable.

# Deno+TypeScript

This project uses deno.json to define many tasks needed to build and maintain the project. This includes transpiling and bundling content for the htdocs directory and use by the web browser. The file build.ts also defines some of the build process, this exists because earlier versions of Deno lacked a bundle feature. Overtime I plan to phase out its use.

# Specialized tooling

Caltech Library has some specialized tooling. The main one is called [CMTools](https://caltechlibrary.github.io/CMTools "this documents CMTools funcitonality"). This uses a codemeta.json file to generate specific files like version.ts and project documentation.  Pandoc is used to render the project website hosted via GitHub pages (gh-pages branch of repository). A Makefile is provided for common development tasks like building and testing the project. These are augmented by generated publish.bash, publish.ps1, release.bash, release.ps1 scripts called form the Makefile. A separate Makefile named website.mak handles building the project documentation web content. It uses Pandoc and PageFind for that process.
