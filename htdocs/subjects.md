
Subjects
========

<ul id="subject-list">Fetching subject list</ul>

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
        let li = document.createElement('li'),
            elem = document.createElement('vocabularly-map'),
            key = keys[i],
            val = data[key];
        elem.value = {'identifier': key, 'name': val};
        li.appendChild(elem);
        subject_list.appendChild(li);
    }
}

oReq.addEventListener('load', updatePage);
oReq.open('GET', '/api/subject');
oReq.send();
</script>
