
DOI Prefix
==========

<ul id="doi-prefix-list">Fetching doi-prefix list</ul>

<script type="module" src="/widgets/vocabulary.js"></script>

<script type="module">
let doi_prefix_list = document.getElementById('doi-prefix-list'),
    oReq = new XMLHttpRequest(),
    u = window.location;

doi_prefix_list.innerHTML = ``;

function updatePage() {
    let src = this.responseText,
        data = JSON.parse(src),
        keys = Object.keys(data);

    keys.sort();
    for (let i = 0; i < keys.length; i++) {
        let li = document.createElement('li'),
            elem = document.createElement('vocabularly-map'),
            key = keys[i],
            val = data[key];
        elem.value = {'identifier': key, 'name': val};
        li.appendChild(elem);
        doi_prefix_list.appendChild(li);
    }
}

oReq.addEventListener('load', updatePage);
oReq.open('GET', '/api/doi-prefix');
oReq.send();
</script>
