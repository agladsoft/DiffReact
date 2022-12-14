import React, {useState, useCallback, useMemo} from 'react';
import ReactDOM from 'react-dom';
import {Input, Button} from 'antd';
import { DownloadOutlined, PoweroffOutlined } from '@ant-design/icons';
import {diffLines, formatLines} from 'unidiff';
import {parseDiff, Diff, Hunk} from 'react-diff-view';
import 'antd/dist/antd.min.css';
import 'react-diff-view/style/index.css';
import './styles.css';
import tokenize from './tokenize';
import $ from 'jquery';
import PizZip from "pizzip";

const EMPTY_HUNKS = [];

const renderToken = (token, defaultRender, i) => {
    switch (token.type) {
        case 'space':
            return (
                <span key={i} className="space">
                    {token.children && token.children.map((token, i) => renderToken(token, defaultRender, i))}
                </span>
            );
        default:
            return defaultRender(token, i);
    }
};

function App() {
    const [{type, hunks}, setDiff] = useState('');

    const useInput = (value, onChange) => {
        return {
            value,
            onChange(e) {
                onChange(e.target.value);
            },
        };
    };

    
    function str2xml(str) {
        if (str.charCodeAt(0) === 65279) str = str.substr(1);
        return new DOMParser().parseFromString(str, "text/xml");
    }


    function addTextToStr(textXml, fullText, string='') {
        if (textXml.childNodes) {
            fullText += string + textXml.childNodes[0]?.nodeValue;
            return fullText
        }
    }

    function getTypeList(abstractsNum, lvl, numId) {
        const lvlAttr = lvl.getAttribute("w:val");
        const numIdAttr = numId.getAttribute("w:val");
        for (let i = 0, len = abstractsNum.length; i < len; i++) {                
            if (abstractsNum[i].getAttribute("w:abstractNumId") == numIdAttr) {
                const lvlTags = abstractsNum[i].getElementsByTagName("w:lvl");
                for (let j = 0, len = lvlTags.length; j < len; j++) {
                    if (lvlTags[j].getAttribute("w:ilvl") == lvlAttr) {
                        const typeList = lvlTags[j].getElementsByTagName("w:numFmt")[0].getAttribute("w:val");
                        return typeList;
                    }
                }
            } 
        }
    }


    function getIterNumberList(textXml, fullText, string, ilvl, numberListHead, numberList, arrayNumberListHead) {
        const numAttr = ilvl.getAttribute("w:val");
        if (numAttr == 0) {
            fullText = addTextToStr(textXml, fullText, `${numberListHead}. `);
            arrayNumberListHead.push(numberListHead);
            numberList = 1;
            numberListHead += 1;
        }
        else if (numAttr == 1) {
            fullText = (arrayNumberListHead.length != 0) ? addTextToStr(textXml, fullText, `${numberListHead - 1}.${numberList}. `) : addTextToStr(textXml, fullText, `${numberListHead}.${numberList}. `);
            numberList += 1;
        }
        return [fullText, numberListHead, numberList];
    }

    function getBulletList(textXml, fullText, string, ilvl, numberListHead, numberList, arrayNumberListHead) {
        fullText = addTextToStr(textXml, fullText, '??? ');
        return [fullText, numberListHead, numberList];
    }

    function getNothingList(textXml, fullText, string, ilvl, numberListHead, numberList, arrayNumberListHead) {
        fullText = addTextToStr(textXml, fullText);
        return [fullText, numberListHead, numberList];
    }

    // insert Docx text
    const [value, onChange] = useState('');
    const objectTypesList = {
        "decimal": getIterNumberList,
        "bullet": getBulletList,
        null: getNothingList
    }
    const handleChange = (e) => {
        var file = e.target.files[0];
        const reader = new FileReader();
        var paragraphs = [];
        var numberListHead = 1;
        var numberList = 1;
        var arrayNumberListHead = [];
        reader.onload = async (e) => {
            const content = e.target.result;            
            const zip = new PizZip(content);
            const xml = str2xml(zip.files["word/document.xml"].asText());
            const xmlNumbering = str2xml(zip.files["word/numbering.xml"].asText());
            const paragraphsXml = xml.getElementsByTagName("w:p");
            const abstractsNum = xmlNumbering.getElementsByTagName("w:abstractNum");
            for (let i = 0, len = paragraphsXml.length; i < len; i++) {                
                let fullText = "";
                const textsXml = paragraphsXml[i].getElementsByTagName("w:t");
                const ilvls = paragraphsXml[i].getElementsByTagName("w:ilvl");
                const numsId = paragraphsXml[i].getElementsByTagName("w:numId");
                for (let j = 0, len2 = textsXml.length; j < len2; j++) {
                    const textXml = textsXml[j];
                    const ilvl = ilvls[j];
                    const numId = numsId[j];
                    var typeList = (ilvl && numId) ? getTypeList(abstractsNum, ilvl, numId) : null;
                    if (typeList in objectTypesList) {
                        [fullText, numberListHead, numberList] = objectTypesList[typeList](textXml, fullText, '', ilvl, numberListHead, numberList, arrayNumberListHead);
                    }
                }
                paragraphs.push(fullText.trim());
            }
            paragraphs = paragraphs.filter(Boolean);
            onChange(paragraphs.join('\n'));
        };
        reader.readAsBinaryString(file);
    };

    // insert PDF text
    const [valueNew, onChangeNew] = useState('');
    async function handleChange2(e) {
        onChangeNew("");
        const file = e.target.files[0];

        const key = file.name;
        const dictFile = {"file": key };
        $('#pdf_files2').attr("placeholder", "????????????????...");
        $.ajax({
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(dictFile),
            dataType: 'json',
            url: 'http://10.23.4.205:5000',
            success: function (e) {
                console.log(e);
                onChangeNew(e['text']);
            },
            error: function(error) {
                alert(`???????? ?? ???????????? ${key} ???? ???????????? ???? ??????????????. ????????????????????, ?????????????????? ???? ???????????? ?? ?????????????????? ?????????? ?????????? ???? ???????? ????????????????.`)
                console.log(error);
        }
        });

        // console.log(file)
        // const fileReader = new FileReader();

        // async function loadPDF(result) {
        //     const key = file.name;
        //     const dictFile = {[key]: result };
        //     $('#pdf_files2').attr("placeholder", "????????????????...");
        //     console.log("Length of binary pdf file", dictFile[key].length);
        //     $.ajax({
        //         type: 'POST',
        //         data: JSON.stringify(dictFile),
        //         dataType: 'json',
        //         url: 'http://127.0.0.1:5000',
        //         success: function (e) {
        //             console.log(e);
        //             onChangeNew(e['text']);
        //         },
        //         error: function(error) {
        //             console.log(error);
        //     }
        //     });

        //     // let response = await fetch("http://127.0.0.1:8080", {
        //     //     method: 'POST',
        //     //     headers: { 'Content-Type': 'application/json' },
        //     //     body: dictFile,
        //     //     mode: 'cors'
        //     // })
        //     // .catch(error => {
        //     //     console.log('ERROR WHILE UPLOADING IMAGE: ',error)
        //     // });

        //     // const new_file = await response.json();
        //     // onChangeNew(new_file['text']);
        // }

        // fileReader.addEventListener('load', ()=> {
        //     loadPDF(fileReader.result)
        // })

        // fileReader.readAsDataURL(file)
    };
    const oldText = useInput(value, onChange);
    const newText = useInput(valueNew, onChangeNew);


    const updateDiffText = useCallback(() => {
        const diffText = formatLines(diffLines(oldText.value, newText.value), {context: 3});
        const [diff] = parseDiff(diffText, {nearbySequences: 'zip'});
        setDiff(diff);
    }, [oldText.value, newText.value, setDiff]);
    const tokens = useMemo(() => tokenize(hunks), [hunks]);


    async function downloadReport() {
        var countError = parseInt(document.getElementById('countError').value);
        const dictFile = {"docx": oldText.value, "pdf": newText.value, "countError": countError ? countError : 0}
        console.log(dictFile)
        let fetchPromise = await fetch("http://94.142.142.205:8000/get_disagreement/", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dictFile),
                mode: 'cors'
            });
        console.log(fetchPromise)
        const blob = await fetchPromise.blob();
        const newBlob = new Blob([blob]);
        const blobUrl = window.URL.createObjectURL(newBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', `data.docx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
    }

    return (
        <div>
            <span style={{display: 'inline-block'}}>
                <label for="countError" style={{display: 'block'}}> ???????????????????? ???????????? ?? ????????????</label>
                <Input className="number" type="number" id="countError" />
            </span>
            <header className="header">
                <span style={{display: 'inline-block'}} className="text">
                    <label for="docx" style={{display: 'block'}}>???????????????? docx</label>
                    <input type="file"  id="docx" onChange={handleChange} />
                </span>
                <span style={{display: 'inline-block'}} className="text">
                    <label for="pdf" style={{display: 'block'}}>???????????????? pdf</label>
                    <input type="file"  id="pdf" onChange={handleChange2} />
                </span>
                
                <div className="input">
                    <Input.TextArea className="text" id='pdf_files' value={oldText} rows={18} placeholder="" {...oldText} />
                    <Input.TextArea className="text" id='pdf_files2' value={newText} rows={18} placeholder="" {...newText} />
                </div>
                <Button className="submit" size="middle" shape="round" type="primary" icon={<DownloadOutlined />} onClick={downloadReport} >
                    DOWNLOAD
                </Button>
                <Button className="submit" type="primary" icon={<PoweroffOutlined />} onClick={updateDiffText}> 
                    GENERATE DIFF
                </Button>
            </header>
            <main>
                <Diff
                    viewType="split"
                    diffType={type}
                    hunks={hunks || EMPTY_HUNKS}
                    tokens={tokens}
                    renderToken={renderToken}
                >
                    {hunks => hunks.map(hunk => <Hunk key={hunk.content} hunk={hunk} />)}
                </Diff>
            </main>
        </div>
    );
}

const rootElement = document.getElementById('root');
ReactDOM.render(<App />, rootElement);
