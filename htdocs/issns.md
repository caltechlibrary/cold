
ISSN
====

<div id="issns-list">Fetching ISSN to Publisher list</div>

<script type="module" src="./widgets/config.js"></script>

<script type="module" src="/widgets/vocabulary.js"></script>

<script type="module">
let issns_list = document.getElementById('issns-list'),
    oReq = new XMLHttpRequest(),
    u = window.location;

issns_list.innerHTML = ``;

function updatePage() {
    let src = this.responseText,
        data = JSON.parse(src),
        keys = Object.keys(data);

    keys.sort();
    for (let i = 0; i < keys.length; i++) {
        let div = document.createElement('div'),
            elem = document.createElement('vocabulary-pair'),
            key = keys[i],
            val = data[key];
        elem.value = { 'identifier': key, 'name': val };
        div.appendChild(elem);
        issns_list.appendChild(div);
    }
}

oReq.addEventListener('load', updatePage);
oReq.open('GET', '/api/issn');
oReq.send();
</script>
