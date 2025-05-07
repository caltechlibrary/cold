
# COLD UI Project

<link href="./pagefind/pagefind-ui.css" rel="stylesheet">
<script src="./pagefind/pagefind-ui.js" type="text/javascript"></script>
<div id="search"></div>
<script>
    console.log(`DEBUG windows.location -> ${window.location.href}`);
    window.addEventListener('DOMContentLoaded', (event) => {
        new PagefindUI({ 
            element: "#search",
            baseUrl: "./"
        });
    });
</script>



