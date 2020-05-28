import React, { useContext, useState, useEffect } from "react";
import {Link} from "react-router-dom";

import styles from "../styles/home.module.scss";

import ListPackages from "../components/ListPackages";
import SingleApp from "../components/SingleApp";
import SelectedContext from "../ctx/SelectedContext";

import art from "../assets/dl.svg";
import Footer from "../components/Footer";

import { FiCopy, FiDownload, FiHome } from "react-icons/fi";
import Toggle from "react-toggle";

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getFilenameFromUrl, isObjectEmpty } from "../utils/helpers";
import axios from "axios";

function Generate() {
    const { selectedApps } = useContext(SelectedContext);
    const [copyText, setCopyText] = useState("Copy to clipboard");
    const [script, setScript] = useState("");
    const [showPS, setShowPS] = useState(false);

    useEffect(() => {
        let installs = [];
        let apps = [];

        selectedApps.map((app) => {
            if (app.id === undefined) return app;

            apps.push(app.id);
            installs.push(`winget install --id=${app.id} -e`);

            return app;
        });

        let newScript = installs.join(showPS ? " ; " : " && ");
        
    
        if(script !== newScript){
            setCopyText("Copy to clipboard")
        }
 
        setScript(newScript)
        
    }, [selectedApps, script, showPS])

    if(selectedApps.length === 0){
      return (
        <div className="container generate-container">
          <div className="illu-box">
            <div className={styles.generate}>
              <h1>Your don't have any apps selected.</h1>
              <h3>
                Make sure you select some apps first to be able to generate a
                script :)
              </h3>
              <Link to="/" className="button">
                <FiHome />
                Go home
              </Link>
            </div>
            <div className="art">
              <img src={art} draggable={false} alt="download icon"/>
            </div>
          </div>
        </div>
      );
    }

    let handleCopy = () => {
        navigator.clipboard.writeText(script).then(() => setCopyText("Copied!")).catch((err) => {
            document.querySelector("textarea").select();
        })
    }

    let handleBat = () => {
        let dl = document.querySelector("#gsc");
        dl.setAttribute("download", `winstall.${showPS ? ".ps1" : ".bat"}`)
        dl.href = "data:text/plain;base64," + btoa(script);
        dl.click();
    }

    let handleScriptSwitch = () => {
      setShowPS(!showPS);

      if (!showPS) {
        setScript(script.replace(/&&/g, ";"));
      } else {
        setScript(script.replace(/;/g, "&&"));
      }

      setCopyText("Copy to clipboard")
    }

    // TODO: Display a message to let the user know the download is in progress
    let handleInstallers = () => {
      let zip = new JSZip();
      let zipFilename = `winstall_installers.zip`;
      let failedDownloads = [];

      let requests = [];

      selectedApps.forEach(app => {
        if(app.contents.Installers.length > 0){
          let appUrl = app.contents.Installers[0].Url;

          requests.push(request(appUrl));
        }
      });

      Promise.allSettled(requests)
      .then(function(results){
        results.forEach((result) => {
          if(result.status === "fulfilled"){
            let value = result.value;
            let requestUrl = value.config.url;
            let responseUrl = value.request.responseURL;
  
            let requestFilename = getFilenameFromUrl(requestUrl);
            let responseFilename = getFilenameFromUrl(responseUrl);
  
            let filename = requestFilename !== null ? requestFilename : responseFilename;
  
            if(filename !== null){
              if(value.status === 200){
                zip.file(filename, value.data, {binary:true});
              } else {
                failedDownloads.push({
                  'url': requestUrl
                });
              }
            } else {
              failedDownloads.push({
                'url': requestUrl
              });
            }
          } else {
            console.log(`Promise was rejected because ${result.reason}`);
          }
        });

        if(!isObjectEmpty(zip.files)){
          zip.generateAsync({type:'blob'}).then(function(content){
            saveAs(content, zipFilename);
          });
        }

        if(failedDownloads.length > 0){
          alert('There were some applications that could not be downloaded.');
          console.log(failedDownloads);
        }
      })
      .catch(function(error){
        console.log(error);
      });
    }

    let request = (url) => {
      return axios.get(url);
    }

    return (
      <div className="container generate-container">
        <div className="illu-box">
          <div className={styles.generate}>
            <h1>Your apps are ready to be installed.</h1>
            <h3>Make sure you have Windows Package Manager installed :)</h3>
            <p>
              Just copy the command from the textbox below, paste it into
              Windows Terminal, Command Prompt, or any other terminal on your
              Windows machine to start installing the apps.
            </p>

            <div className="switch">
              <Toggle
                id="biscuit-status"
                defaultChecked={showPS}
                aria-labelledby="biscuit-label"
                onChange={handleScriptSwitch}
              />
              <span id="biscuit-label">Show PowerShell script</span>
            </div>

            <textarea
              value={script}
              onChange={() => {}}
              onFocus={(e) => e.target.select()}
            />

            <div className="box">
              <button className="button accent" onClick={handleCopy}>
                <FiCopy />
                {copyText}
              </button>

              <button className="button" onClick={handleInstallers}>
                <FiDownload />
                Download Installers
              </button>

              <button className="button" onClick={handleBat}>
                <FiDownload />
                Download {showPS ? ".ps1" : ".bat"}
              </button>
            </div>
          </div>
          <div className="art">
            <img src={art} draggable={false} alt="download icon" />
          </div>
        </div>

        <div className={styles.selectedApps}>
          <h2>Apps you are downloading ({selectedApps.length})</h2>
          <ListPackages showImg={false}>
            {selectedApps.map((app, index) => (
              <React.Fragment key={index}>
                <SingleApp app={app} />
              </React.Fragment>
            ))}
          </ListPackages>
        </div>

        <Footer />
      </div>
    );
}

export default Generate;
