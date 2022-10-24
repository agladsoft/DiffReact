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
import {run} from './animate.js'
import PizZip from "pizzip"

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

    // insert Docx text
    const [value, onChange] = useState('');
    function str2xml(str) {
        if (str.charCodeAt(0) === 65279) str = str.substr(1);
        return new DOMParser().parseFromString(str, "text/xml");
    }
    const handleChange = (e) => {
        var file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const zip = new PizZip(content);
            const xml = str2xml(zip.files["word/document.xml"].asText());
            const paragraphsXml = xml.getElementsByTagName("w:p");
            var paragraphs = [];

            for (let i = 0, len = paragraphsXml.length; i < len; i++) {
                let fullText = "";
                const textsXml = paragraphsXml[i].getElementsByTagName("w:t");
                for (let j = 0, len2 = textsXml.length; j < len2; j++) {
                    const textXml = textsXml[j];
                    if (textXml.childNodes) {
                        fullText += textXml.childNodes[0]?.nodeValue;
                }
                }
                paragraphs.push(fullText.trim());
            }
            paragraphs = paragraphs.filter(Boolean)
            onChange(paragraphs.join('\n'))
        };
        reader.readAsBinaryString(file);
    };

    // insert PDF text
    const [valueNew, onChangeNew] = useState('');
    async function handleChange2(e) {
        onChangeNew("");
        const file = e.target.files[0];
        const fileReader = new FileReader();
        fileReader.addEventListener('load', ()=> {
            loadPDF(fileReader.result)
        })
        async function loadPDF(result) {
            const key = file.name
            const dictFile = {[key]: result }
            run()
            let response = await fetch("http://10.23.4.205:5000", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dictFile),
                mode: 'cors'
            });
            const new_file = await response.json();
            onChangeNew(new_file['text']);
        }
        fileReader.readAsDataURL(file)
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
        document.getElementById('countError').addEventListener('click', ()=> {
            requestJson(dictFile)
        })
        async function requestJson(dictFile) {
            let response = await fetch("http://94.142.142.205:8000/get_disagreement/", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dictFile),
                mode: 'cors'
            });
            const data = await response.json();
            console.log(data)
        }
    }
    return (
        <div>
            <input type="number" id="countError" />
            <header className="header">
                <input type="file" className="text" onChange={handleChange} />
                <input type="file" className="text" onChange={handleChange2} />
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
