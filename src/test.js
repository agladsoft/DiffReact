
const openFile = function(event) {
    var input = event.target;

    var reader = new FileReader();
    reader.onload = function(){
      var dataURL = reader.result;
      console.log(dataURL)
    };
    reader.readAsDataURL(input.files[0]);

}
console.log(openFile)
const uploadForm = document.querySelector('.upload')
    if(uploadForm){
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault()
            let file = e.target.uploadFile.files[0]
            const key = file.name;
            console.log(key)
            let formData = new FormData()
            formData.append('file', file)
            console.log(formData)
            fetch('http://127.0.0.1:5000', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(formData)
            })
            .then(resp => resp.json())
            .then(data => {
                if (data.errors) {
                alert(data.errors)
                }
                else {
                console.log(data)
                }
            })
        })
    }