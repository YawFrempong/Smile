var canvas
var canvas_2d
const video = document.getElementById('video')
const pic_1 = document.getElementById('pic_1')
const image_collection = document.getElementById('image_collection')
const num_buttons = document.getElementById('num_buttons')
const detection_button = document.getElementById("detection_button")
const cuny_button = document.getElementById("CUNY_button");
const fer2013_button = document.getElementById("FER2013_button");
const cuny_notebook = document.getElementById("CUNY");
const fer2013_notebook = document.getElementById("FER");
const show_detections = document.getElementById("show_detections");
const slider_values = ['threshold: low','threshold: medium','threshold: high'];
var threshold_slider = document.getElementById('threshold_slider'), threshold_slider_output = document.getElementById('threshold_slider_output');
var go = true
var first_photo = true
var frame_count = 0
var slideIndex = 1
var photo_counter = 1
var screenshot_url = ''
var do_Detection = false
var fer_toggle = true
var cuny_toggle = true
var take_photo_arr = []
var threshold_max = 1
var threshold_min = 1

cuny_notebook.style.display = "none"
fer2013_notebook.style.display = "none"

fer2013_button.onclick = function(){
    if(fer_toggle){
        fer2013_button.innerText="hide";
        fer2013_notebook.style.display = "block"
    } else {
        fer2013_button.innerText="show";
        fer2013_notebook.style.display = "none"
    }
    fer_toggle = !(fer_toggle)
}

cuny_button.onclick = function(){
    if(cuny_toggle){
        cuny_button.innerText="hide";
        cuny_notebook.style.display = "block"
    } else {
        cuny_button.innerText="show";
        cuny_notebook.style.display = "none"
    }
    cuny_toggle = !(cuny_toggle)
}

threshold_slider.oninput = function(){
    threshold_slider_output.innerHTML = slider_values[this.value];

    if(this.value == 0){
        threshold_max = 1
        threshold_min = 1
    }
    else if(this.value == 1){
        threshold_max = 5
        threshold_min = 3
    }
    else if(this.value == 2){
        threshold_max = 7
        threshold_min = 7
    }
};
threshold_slider.oninput();

showDivs(slideIndex);

function plusDivs(n) {
  showDivs(slideIndex += n);
}

function currentDiv(n) {
  showDivs(slideIndex = n);
}

function showDivs(n) {
  var i;
  var x = document.getElementsByClassName("mySlides");
  var dots = document.getElementsByClassName("demo");
  if (n > x.length) {slideIndex = 1}    
  if (n < 1) {slideIndex = x.length}
  for (i = 0; i < x.length; i++) {
    x[i].style.display = "none";  
  }
  for (i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" w3-red", "");
  }
  x[slideIndex-1].style.display = "block";  
  dots[slideIndex-1].className += " w3-red";
}

function toggleDetection(){
    do_Detection = !(do_Detection)
    if(do_Detection){
        detection_button.innerText="Stop Detections";
        detection_button.style="background-color:red"
    }
    else {
        detection_button.innerText="Start Detections";
        detection_button.style="background-color:green"
    }
}

function get_model_selection(){
    const radio_button_selection = document.querySelectorAll('input[name="model_selection"]');
    let selectedValue;
    for (const selection of radio_button_selection) {
        if (selection.checked) {
            selectedValue = selection.value;
            break;
        }
    }
    return selectedValue;
}

function downloadImage(data_url_download){
    image_download = data_url_download.replace("image/png", "image/octet-stream");
    link = document.createElement('a');
    link.download = "detection.png";
    link.href = image_download;
    link.click();
}

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo)

function startVideo() {
    navigator.getUserMedia(
        {video: {}},
        stream => video.srcObject = stream,
        err => console.error(err)
    )
}
function drawCoordinates(ref,x,y){
    var pointSize = 50; // Change according to the size of the point.
    //var ctx = document.getElementById("canvas").getContext("2d");

    ref.fillStyle = "#ff2626"; // Red color

    ref.beginPath(); //Start path
    ref.arc(x, y, pointSize, 0, Math.PI * 2, true); // Draw a point using the arc function of the canvas with a point structure.
    ref.fill(); // Close the path and fill.
}

function server_listener(val){
    socket = new WebSocket("ws://localhost:8765");
    socket.onopen= function() {
        socket.send(val);
    };
    socket.onmessage= function(s) {
        overall_emotion = []
        take_photo = true
        detection_data = s.data
        detection_all = detection_data.split("|Y|")
        detection_all.pop()

        for(i = 0; i < detection_all.length; i++){
            person_data = detection_all[i]
            person_arr = person_data.split('|||')
            person_emotion = person_arr[0]
            person_x = person_arr[1]
            person_y = person_arr[2]
            overall_emotion.push(person_emotion)
            
            if(show_detections.checked){
                canvas_2d.font = "30px Comic Sans MS";
                canvas_2d.fillStyle = "red";
                canvas_2d.textAlign = "center";
                canvas_2d.fillText(person_emotion, person_x, person_y);
            }
        }

        for(i = 0; i < overall_emotion.length; i++){
            if(overall_emotion[i] != 'happiness'){
                take_photo = false
            }
        }

        console.log(take_photo_arr)
        //require 5 consecutive frames of happiness of every face in each frame
        if(take_photo_arr.length == threshold_max){
            true_count = 0
            for(i = 0; i < take_photo_arr.length; i++){
                if(take_photo_arr[i]){
                    true_count++;
                }
            }
            if(true_count >= threshold_min){
                true_count = 0
                take_photo_arr = []

                if(first_photo){
                    first_photo = false
                    pic_1.src = screenshot_url
                    photo_counter++;
                }
                else {
                    if(photo_counter <= 20){
                        image_collection.innerHTML += `<img id ="pic_` + photo_counter +`" class="mySlides" src="" style="width:100%" alt="" onclick="downloadImage(this.src)"></img>`
                        num_buttons.innerHTML += `<button class="w3-button demo" onclick="currentDiv(` + photo_counter +`)">` + photo_counter + `</button>`
                        photo_id = 'pic_' + photo_counter
                        curr_pic = document.getElementById(photo_id)
                        curr_pic.src = screenshot_url
                        photo_counter++;
                    }
                    else {
                        source_all = []
                        for(i = 1; i <= 20; i++){
                            temp_id = 'pic_' + i
                            temp_val = document.getElementById(temp_id)
                            source_all.push(temp_val.src)
                        }
    
                        source_all.shift()
                        source_all.push(screenshot_url)
    
                        for(i = 1; i <= 20; i++){
                            temp_id = 'pic_' + i
                            temp_val = document.getElementById(temp_id)
                            temp_val.src = source_all[i-1]
                        }
                    }
                }
            }
            else {
                take_photo_arr = []
            }
        }
        else {
            take_photo_arr.push(take_photo)
        }
    };
}

video.addEventListener('play', () => {
    canvas = faceapi.createCanvasFromMedia(video)
    canvas_2d = canvas.getContext('2d')
    document.body.append(canvas)
    const displaySize = {width: video.width, height: video.height}
    faceapi.matchDimensions(canvas, displaySize)

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        const resizedDetections = faceapi.resizeResults(detections, displaySize)
        var lastest_url = ""
        //face detected
        if(resizedDetections.length > 0){
            bb_data_total = ''
            for(i = 0; i < resizedDetections.length; i++){
                bounding_box_obj = resizedDetections[i]
                box_info = bounding_box_obj._box
                x_top_left = box_info._x
                y_top_left = box_info._y
                x_bottom_left = box_info._x
                y_bottom_left = box_info._y + box_info._height
                x_top_right = box_info._x + box_info._width
                y_top_right = box_info._y
                x_bottom_right = box_info._x + + box_info._width
                y_bottom_right = box_info._y + box_info._height

                //full image
                canvas_2d.drawImage(video, 0, 0, 720, 545, 0, 0, 720, 545)
                lastest_url = canvas.toDataURL("image/png")
                canvas_2d.clearRect(0, 0, canvas.width, canvas.height);

                //add more of the face(top left corner)
                x_top_left = x_top_left - 25
                y_top_left = y_top_left - 50

                //handle negative values
                x_top_left = Math.max(x_top_left, 0)
                y_top_left = Math.max(y_top_left, 0)

                //cropped image
                canvas_2d.drawImage(video,x_top_left, y_top_left, box_info._width, box_info._height, 0, 0, box_info._width, box_info._height)
                bb_data_total += x_top_right.toString() + "|||" +  y_top_right.toString() + "|||"  + x_bottom_right.toString() +  "|||" + y_bottom_right.toString() + "|||" + box_info._width.toString() + "|||" + box_info._height.toString() + "|||" + canvas.toDataURL("image/png") + "|||" + frame_count + "|X|" + get_model_selection()
            }
            if(do_Detection){
                server_listener(bb_data_total)
                frame_count++;
            }
        }
        screenshot_url = lastest_url
        canvas_2d.clearRect(0, 0, canvas.width, canvas.height);
    }, 200)
})