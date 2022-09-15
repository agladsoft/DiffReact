import React, {useState, useCallback, useMemo} from 'react';
import ReactDOM from 'react-dom';
import {Input, Button} from 'antd';
import {diffLines, formatLines} from 'unidiff';
import {parseDiff, Diff, Hunk} from 'react-diff-view';
import 'antd/dist/antd.min.css';
import 'react-diff-view/style/index.css';
import './styles.css';
import tokenize from './tokenize';
import Docxtemplater from "docxtemplater";


const EMPTY_HUNKS = [];

const renderToken = (token, defaultRender, i) => {
    switch (token.type) {
        case 'space':
            console.log(token);
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

    // // insert oldText
    // const [oldText, setTextValue] = useState('');
    // const handleChange = (e) => {
    //     const file = e.target.files[0];
    //     let reader = new FileReader();
    //     reader.onload = (e) => {
    //         const file = e.target.result;
    //         console.log(file);
    //         setTextValue(file);
    //     };
    //     reader.onerror = (e) => alert(e.target.error.name);
    //     reader.readAsText(file);
    // };


    // insert PDF text
    const [oldText, setTextValue] = useState('');
    async function handleChange(e) {
        const file = { file: e.target.files[0].name };
        console.log(file);
        let response = await fetch("http://127.0.0.1:5000", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(file),
            mode: 'cors'
        });
        const new_file = await response.json();
        console.log(new_file['text']);
        setTextValue(new_file['text']);
    };

    // insert newText
    const [newText, setTextValue2] = useState('');
    const handleChange2 = (e) => {
        const file = e.target.files[0];
        let reader = new FileReader();
        reader.onload = (e) => {
            const file = e.target.result;
            console.log(file);
            setTextValue2(file);
        };
        reader.onerror = (e) => alert(e.target.error.name);
        reader.readAsText(file);
    };

    // // insert Jpg text
    // const [oldText, setTextValue] = useState('');
    // const handleChange = (e) => {
    //     const worker = createWorker();
          
    //       (async () => {
    //         await worker.load();
    //         await worker.loadLanguage('rus+eng');
    //         await worker.initialize('rus+eng');
    //         const { data: { text } } = await worker.recognize(e.target.files[0]);
    //         console.log(text);
    //         setTextValue(text);
    //         await worker.terminate();
    //       })();
    // };
    
    // // insert Docx text
    // const [oldText, setTextValue] = useState('');
    // const handleChange = (e) => {
    //     const file = e.target.files[0];
    //     const reader = new FileReader();
    //     reader.onload = async (e) => {
    //         const content = e.target.result;
    //         var doc = new Docxtemplater(new PizZip(content), {delimiters: {start: '12op1j2po1j2poj1po', end: 'op21j4po21jp4oj1op24j'}});
    //         var text = doc.getFullText();
    //         console.log(text);
    //         setTextValue(text);
    //     };
    //     reader.readAsBinaryString(file);
    // };

    // // insert Docx text
    // const [newText, setTextValue2] = useState('');
    // const handleChange2 = (e) => {
    //     const file = e.target.files[0];
    //     const reader = new FileReader();
    //     reader.onload = async (e) => {
    //         const content = e.target.result;
    //         var doc = new Docxtemplater(new PizZip(content), {delimiters: {start: '12op1j2po1j2poj1po', end: 'op21j4po21jp4oj1op24j'}});
    //         var text = doc.getFullText();
    //         console.log(text);
    //         setTextValue2(text);
    //     };
    //     reader.readAsBinaryString(file);
    // };


    const updateDiffText = useCallback(() => {
        const diffText = formatLines(diffLines(oldText, newText), {context: 3});
        const [diff] = parseDiff(diffText, {nearbySequences: 'zip'});
        setDiff(diff);
    }, [oldText, newText, setDiff]);
    const tokens = useMemo(() => tokenize(hunks), [hunks]);

    return (
        <div>
            <header className="header">
                <input type="file" className="text" onChange={handleChange} />
                <input type="file" className="text" onChange={handleChange2} />
                <div className="input">
                    <Input.TextArea className="text" value={oldText} onChange={setTextValue} rows={10} placeholder="old text..." {...oldText} />
                    <Input.TextArea className="text" value={newText} onChange={setTextValue2} rows={10} placeholder="new text..." {...newText} />
                </div>
                <Button className="submit" type="primary" onClick={updateDiffText}> 
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
