import cv2
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow import keras
from keras.models import Sequential
from keras.layers import Dense, Flatten, Conv2D, MaxPooling2D, Dropout
from tensorflow.keras import layers
from keras.utils import to_categorical
from keras.optimizers import SGD

import numpy as np
import os
import asyncio
import websockets
import random
import base64
import re

first_image = True
decode_1 = {1:'happiness', 2:'contempt', 3:'neutral', 4:'disgust', 5:'fear', 6:'anger', 7:'surprise', 8:'sadness'}
list_idx_1 = [1,2,3,4,5,6,7,8]
decode_2 = {1:'happiness', 2:'neutral', 3:'disgust', 4:'fear', 5:'anger', 6:'surprise', 7:'sadness'}
list_idx_2 = [1,2,3,4,5,6,7]

def uri_to_image(uri, w, h):
    im_bytes = base64.b64decode(uri)
    im_arr = np.frombuffer(im_bytes, dtype=np.uint8)
    img = cv2.imdecode(im_arr, cv2.IMREAD_COLOR)
    crop_img = img[0:h, 0:w]
    im_small = cv2.resize(crop_img, (48, 48), interpolation=cv2.INTER_LINEAR)
    return im_small

def create_model_1():
    model = Sequential()
    model.add(Conv2D(48, (5,5), activation='relu', input_shape=(48,48,3)))
    model.add(MaxPooling2D(pool_size = (2,2)))
    model.add(Conv2D(48, (5,5), activation='relu'))
    model.add(MaxPooling2D(pool_size = (2,2)))
    model.add(Flatten())
    model.add(Dense(1000, activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(500, activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(250, activation='relu'))
    model.add(Dense(9, activation='softmax'))
    model.compile(loss = 'categorical_crossentropy', optimizer = 'adam', metrics = ['accuracy'])
    return model

def create_model_2():
    model = Sequential()
    model.add(Conv2D(48, (5,5), activation='relu', input_shape=(48,48,3)))
    model.add(MaxPooling2D(pool_size = (2,2)))
    model.add(Conv2D(48, (5,5), activation='relu'))
    model.add(MaxPooling2D(pool_size = (2,2)))
    model.add(Flatten())
    model.add(Dense(1000, activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(500, activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(250, activation='relu'))
    model.add(Dense(8, activation='softmax'))
    model.compile(loss = 'categorical_crossentropy', optimizer = 'adam', metrics = ['accuracy'])
    return model

async def hello(websocket, path):
    global first_image
    global my_model
    global decode
    global list_idx

    face_data = await websocket.recv()
    data_all = face_data.split('|X|')
    user_selection = data_all.pop()
    
    send_data = ''
    for person in data_all:
        data_arr = person .split('|||')
        bb_coor = data_arr[:4]
        img_width = round(float(data_arr[4]))
        img_height = round(float(data_arr[5]))
        img_uri = data_arr[6]
        frame_num = data_arr[7]
        dirty_uri = img_uri.split(',')[1]
        clean_uri = dirty_uri
        img = uri_to_image(clean_uri, img_width, img_height)

        #predict emotion from image
        answer_dict = {}

        if user_selection == '1':
            predictions = my_model_1.predict(np.array([img]))
            x = predictions
            for i in range(len(list_idx_1)):
                for j in range(len(list_idx_1)):
                    if x[0][list_idx_1[i]] > x[0][list_idx_1[j]]:
                        temp = list_idx_1[i]
                        list_idx_1[i] = list_idx_1[j]
                        list_idx_1[j] = temp
            
            for i in range(len(list_idx_1)):
                answer_dict[decode_1[list_idx_1[i]]] = round(predictions[0][list_idx_1[i]] * 100, 2)

        elif user_selection == '2':
            np_img = np.array([img])
            np_img = np_img / 225
            predictions = my_model_2.predict(np_img)
            x = predictions
            for i in range(len(list_idx_2)):
                for j in range(len(list_idx_2)):
                    if x[0][list_idx_2[i]] > x[0][list_idx_2[j]]:
                        temp = list_idx_2[i]
                        list_idx_2[i] = list_idx_2[j]
                        list_idx_2[j] = temp

            for i in range(len(list_idx_2)):
                answer_dict[decode_2[list_idx_2[i]]] = round(predictions[0][list_idx_2[i]] * 100, 2)


        max_key = max(answer_dict, key=answer_dict.get)
        send_data += max_key + '|||' + bb_coor[0] + '|||' + bb_coor[1] + '|||' + frame_num + '|Y|'

    await websocket.send(send_data)

#load Model
my_model_1 = create_model_1()
my_model_1.load_weights("saved_model/CUNY/cp.ckpt")

my_model_2 = create_model_2()
my_model_2.load_weights("saved_model/FER2013/cp.ckpt")

#start server
start_server = websockets.serve(hello, "localhost", 8765)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()