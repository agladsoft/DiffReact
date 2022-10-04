import React, {useState, useCallback, useMemo} from 'react';
import ReactDOM from 'react-dom';
import {Input, Button} from 'antd';
import {diffLines, formatLines} from 'unidiff';
import {parseDiff, Diff, Hunk} from 'react-diff-view';
import 'antd/dist/antd.min.css';
import 'react-diff-view/style/index.css';
import './styles.css';
import tokenize from './tokenize';
import {run} from './animate.js'
import PizZip from "pizzip"
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

    // insert Docx text
    const [oldText, setTextValue] = useState('');
    const handleChange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            var doc = new Docxtemplater(new PizZip(content), {delimiters: {start: '12op1j2po1j2poj1po', end: 'op21j4po21jp4oj1op24j'}});
            var text = doc.getFullText();
            console.log(text);
            setTextValue(text);
        };
        reader.readAsBinaryString(file);
    };

    // insert PDF text
    const [newText, setTextValue2] = useState('');
    async function handleChange2(e) {
        setTextValue2("");
        const file = e.target.files[0];
        const fileReader = new FileReader();
        fileReader.addEventListener('load', ()=> {
            loadPDF(fileReader.result)
        })
        async function loadPDF(result) {
            const key = file.name
            const dictFile = {[key]: result }
            console.log(dictFile)
            run()
            let response = await fetch("http://127.0.0.1:5000", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dictFile),
                mode: 'cors'
            });
            const new_file = await response.json();
            console.log(new_file['text']);
            setTextValue2(new_file['text']);
        }
        fileReader.readAsDataURL(file)
    };


    const updateDiffText = useCallback(() => {
        const diffText = formatLines(diffLines(oldText, newText), {context: 3});
        const [diff] = parseDiff(diffText, {nearbySequences: 'zip'});
        setDiff(diff);
    }, [oldText, newText, setDiff]);
    const tokens = useMemo(() => tokenize(hunks), [hunks]);
    console.log(tokens);

    // function SplitByString(source, splitBy) {
    //     var splitter = splitBy.split('');
    //     splitter.push([source]); //Push initial value
      
    //     return splitter.reduceRight(function(accumulator, curValue) {
    //       var k = [];
    //       accumulator.forEach(v => k = [...k, ...v.split(curValue)]);
    //       return k;
    //     });
    //   }

    // try {
    //     for (let i = 0; i < tokens['new'][0].length; i++) {
    //         console.log(tokens['new'][0][i]);
    //         if (tokens['new'][0][i]['type'] === 'text') {
    //             var splitBy = ",. ";
    //             const array_text = SplitByString(tokens['new'][0][i]['value'], splitBy);
    //             console.log(array_text.slice(array_text.length - 2, array_text.length))
    //         }
    //         else {
    //             // console.log(tokens['new'][0][i]['lineNumber'])
    //             console.log(tokens['new'][0][i]['children'][0]['value'])
    //         }
    //       }
    //   } catch (error) {
    //     console.error(error);
    // }

    return (
        <div>
            <header className="header">
                <input type="file" className="text" onChange={handleChange} />
                <input type="file" className="text" onChange={handleChange2} />
                <div className="input">
                    <Input.TextArea className="text" id='pdf_files' value={oldText} onChange={setTextValue} rows={10} placeholder="" {...oldText} />
                    <Input.TextArea className="text" id='pdf_files2' value={newText} onChange={setTextValue2} rows={10} placeholder="" {...newText} />
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
