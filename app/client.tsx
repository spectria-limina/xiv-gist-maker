'use client';
import { Dispatch, SetStateAction, useState } from 'react';
import {inflate} from 'pako';
import { createGist, updateGist } from './server';
import PostBody, { GitHubGist } from './types';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import { IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function AppMain({data}:{data:GitHubGist[]}) {
  const [selectedGist,setSelectedGist] = useState<string>('new');
  const [sharelink,setSharelink] = useState('');
  const [isError,setIsError] = useState(false);
  const [buttonActive,setButtonActive] = useState(false);
  const [newGistName,setNewGistName] = useState('XIVPlan JSON');
  const [createdGistURL,setCreatedGistURL] = useState('');
  const handleSubmit = async () => {
    if(selectedGist === 'new') {
      const submittedJSON = JSON.stringify(parseJSONfromURL(sharelink));
      const postContent = JSON.stringify(new PostBody(newGistName, submittedJSON));
      const postContentLength = postContent.length;
      const result = await createGist(postContent, postContentLength);
      if (result.success) {
        if (result.data) {
          console.log(result.data);
          const regex = /([^\/]+)\/[^\/]+(\/[^\/]+)$/;
          const rawURL = result.data.files['XIVPlan.json'].raw_url;
          const fixedURL = rawURL.replace(regex, '$1$2');
          setCreatedGistURL(fixedURL);
          setSharelink('');
        }
      } else {
        setIsError(true);
        setSharelink('');
      }
    } else if (selectedGist !== 'new') {
      const submittedJSON = JSON.stringify(parseJSONfromURL(sharelink));
      const selectedObj = data.filter(gist => gist.id === selectedGist )[0];
      if(selectedObj.description) {
        const postContent = JSON.stringify(new PostBody(selectedObj.description, submittedJSON));
        const postContentLength = postContent.length;
        const result = await updateGist(selectedGist, postContent, postContentLength);
        if (result.success) {
          if (result.data) {
            console.log(result.data);
            const regex = /([^\/]+)\/[^\/]+(\/[^\/]+)$/;
            const rawURL = result.data.files['XIVPlan.json'].raw_url;
            const fixedURL = rawURL.replace(regex, '$1$2');
            setCreatedGistURL(fixedURL);
            setSharelink('');
          }
        } else {
          setIsError(true);
          setSharelink('');
      }
      }
    }
    
  };
  const handleCardClick = (event: React.MouseEvent, id: string) => {
    if (event.detail > 0) {
      setSelectedGist(id);
    }
  };
  const handleKeyDown = (event: { key: string; preventDefault: () => void; }) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleValidation();
      }
    };
    const handleValidation = () => {
      const isValid = validateInput(sharelink)
      setIsError(!isValid);
      if(sharelink==='') {
        setButtonActive(false);
      } else {
        setButtonActive(isValid);
      }
    }
  return (
    <>
    <Paper
        elevation={3}
        sx={{
          width: {
            xs: '100vw',
            sm: '80vw',
          },
          minWidth: {
            xs: 'auto',
            sm: '600px',
          },
          height: {
            xs: '20vh',
            sm: '20vh',
          },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          margin: 4,
          boxSizing: 'border-box'
        }}
      >
        <ValidatedInput sharelink={sharelink} isError={isError} setSharelink={setSharelink} handleValidation={handleValidation} handleKeyDown={handleKeyDown} buttonActive={buttonActive} selected={selectedGist} clickHandler={handleSubmit}/>
        {createdGistURL?
          <DisplayXIVPlanURL url={createdGistURL}/>
        :
          <></>
        }
    </Paper>
    <DisplayedGists data={data} selected={selectedGist} handleCardClick={handleCardClick} newGistName={newGistName} setNewGistName={setNewGistName}/>
    </>
  )
}

function ValidatedInput({sharelink, isError, setSharelink, handleValidation, handleKeyDown, buttonActive, selected, clickHandler}:
    {sharelink:string, isError:boolean, setSharelink:any, handleValidation:any, handleKeyDown:any, buttonActive:boolean, selected: string, clickHandler:()=>Promise<void>}) {
  return (
    <>
    <Box
      component='form'
      sx={{ '& .MuiTextField-root': { m: 1, width: '50ch' } }}
      noValidate
      autoComplete='off'
    >
      <div>
        <TextField
          label='XIVPlan Share Link'
          value={sharelink}
          error={isError}
          id='xivplan-input-textarea'
          placeholder='Paste link here'
          helperText={isError?'Not an XIVPlan share link or malformed link':''}
          variant='outlined'
          onChange={(e) => setSharelink(e.target.value)}
          onBlur={()=>{handleValidation()}}
          onKeyDown={handleKeyDown}          
        />
      </div>
    </Box>
    <GenerateButton state={buttonActive} selected={selected} clickHandler={clickHandler}/>
    </>
  );
}

function GenerateButton({state,selected,clickHandler}:{state: boolean, selected:string, clickHandler:()=>Promise<void>}) {
    return (
      <Button
        sx={{ '& .MuiTextField-root': { m: 1, width: '50ch' } }}
        disabled = {!state}
        variant="contained"
        onClick={clickHandler}
      >
        {selected==='new'?'Create New':'Update Gist'}
      </Button>
    )
}

async function copyToClipboard(text:string) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied to clipboard');
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

function DisplayXIVPlanURL({url}:{url:string}){
  const formattedUrl = `https://xivplan.netlify.app/?url=${encodeURIComponent(url)}`
    return (
      <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
      <TextField
        sx= {{
          width: '50ch',
          padding: 1,
          margin: 1,
        }} 
        id="XIVPlan-formatted-url"
        variant="filled"
        value={formattedUrl}
      />
      <IconButton size='large' onClick={()=>{copyToClipboard(formattedUrl)}}>
        <ContentCopyIcon/>
      </IconButton>
      </Box>
    )
}

function validateInput(input:string) {
    const regex = /^https:\/\/xivplan.netlify.app\/#\/plan\/[a-zA-Z0-9-_]*$/m;
    if (input === '') {
        //don't throw errors when empty
        return true;
    }
    if (!regex.test(input)) {
        return false;
    }
    try {
        parseJSONfromURL(input);
    }
    catch {
        return false;
    }
    return true;
}

function parseJSONfromURL(url:string) {
    const searchTarget = '/plan/';
    const fixedInput = url.replaceAll('-', '+')
                            .replaceAll('_','/')
                            .substring(url.indexOf(searchTarget)+searchTarget.length)
    const binData = atob(fixedInput);
    const charData = binData.split('').map(function (x) { return x.charCodeAt(0); });
    const zlibData = new Uint8Array(charData);
    const data = inflate(zlibData);
    //@ts-expect-error this shit is so weird????
    return JSON.parse(String.fromCharCode.apply(null, new Uint16Array(data)));
}

function DisplayedGists({data, selected, handleCardClick, newGistName, setNewGistName}:{data:GitHubGist[], selected:string|null, handleCardClick: (event: any,id: any)=>void, newGistName:string, setNewGistName:Dispatch<SetStateAction<string>>}) {
  const defaultName = "XIVPlan JSON";
  
  const handleUpdate = (event: { target: { value: SetStateAction<string>; }; }) => {
    setNewGistName(event.target.value)
  }
  const handleResetToDefault = () => {
    setNewGistName(defaultName)
  }  
  return (    
        <div style={{
            display: 'flex',
            flexDirection: 'row'
        }}>
          <Card
            key='newGistCreationCard'
            onClick={(e) => handleCardClick(e, 'new')}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'start',
                alignItems: 'start',
                width: '200px',
                height: '220px',
                padding: 2,
                margin: 1,
                overflow: 'hidden',
                border: selected==='new' ? '2px solid #1976d2' : '2px solid transparent',
                backgroundColor: selected==='new' ? '#e3f2fd' : 'background.paper',
                boxShadow: selected==='new' ? 6 : 1,
                transform: selected==='new' ? 'scale(1.02)' : 'none',
                '&:focus': {
                  outline: 'none',
                },
            }}
          >
            <Typography variant='h6' gutterBottom>Create New Gist</Typography>
            <TextField
                required
                id="new-gist-name"
                label="Input Name"
                placeholder="Be Descriptive!"
                variant="standard"
                value={newGistName}
                onChange={handleUpdate}
            />
            <Button sx={{
              margin: 'auto',
              padding: 1,
              size: 'small'
              }}
              onClick={handleResetToDefault}
            >
              Default Name
            </Button>
        </Card>
            {data.map(jsonData=>{
              const isSelected = jsonData.id === selected;
              return <Card
                key={jsonData.url}
                onClick={(e) => handleCardClick(e, jsonData.id)}
                sx={{
                  justifyContent: 'start',
                  alignItems: 'start',
                  width: '200px',
                  height: '220px',
                  padding: 2,
                  margin: 1,
                  overflow: 'hidden',
                  border: isSelected ? '2px solid #1976d2' : '2px solid transparent',
                  backgroundColor: isSelected ? '#e3f2fd' : 'background.paper',
                  boxShadow: isSelected ? 6 : 1,
                  transform: isSelected ? 'scale(1.02)' : 'none',
                  '&:focus': {
                    outline: 'none',
                  },
                }}
              >
                <Typography variant="h6" gutterBottom>{jsonData.description}</Typography>
                <Typography variant="body2" gutterBottom><strong>Created On: </strong>{new Date(jsonData.created_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</Typography>
                <Typography variant="body2" gutterBottom><strong>Last Updated: </strong>{new Date(jsonData.updated_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</Typography>
                <Typography variant="caption" style={{
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                  <a href={jsonData.html_url} target='_blank'>
                    Click to view Gist online
                  </a>
                </Typography>
        </Card>;})}
        </div>
    );
}