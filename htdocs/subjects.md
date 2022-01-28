
Subjects
========

This page lists the subjects by subject id and the text description (i.e. name).

<div id="subject-list">Fetching subject list</div>

<script type="module" src="/widgets/vocabulary.js"></script>

<script type="module">
let subject_list = document.getElementById('subject-list'),
    oReq = new XMLHttpRequest(),
    u = window.location;

subject_list.innerHTML = ``;

function updatePage() {
    let src = this.responseText,
        data = JSON.parse(src),
        keys = Object.keys(data);

    keys.sort();
    for (let i = 0; i < keys.length; i++) {
    console.log("DEBUG keys ", i);
        let elem = document.createElement('vocabulary-pair'),
            key = keys[i],
            val = data[key];
        elem.value = { 'identifier': key, 'name': val };
        subject_list.appendChild(elem);
        subject_list.appendChild(document.createElement('br'));
    }
}

oReq.addEventListener('load', updatePage);
oReq.open('GET', '/api/subject');
oReq.send();
</script>