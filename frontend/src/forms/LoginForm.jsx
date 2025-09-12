import './LoginForm.css'
import {useState, useEffect} from 'react'
import { useNavigate }from 'react-router-dom'
import axios from '../api/axios'
import { useToken } from '../TokenContext';

function LoginForm(){
    // Preparing the forms for inputs
    const[action, setAction] = useState('')
    const[username, setUsername]= useState('')
    const[password, setPassword]= useState('')
    const[email, setEmail]= useState('')
    const { } = useToken();
    const navigate = useNavigate()

    useEffect(() => {
        if(document.cookie){
            console.log(document.cookie)
        } else {
            console.log("no cookie")
        }
    }, [])
    // Clears all input fields 
    const clearInfo = () => {
        setUsername('');
        setPassword('');
        setEmail('');
    };

    const movetoLogin = () =>{
        clearInfo()
        setAction('')
    }
    const movetoRegister=()=>{
        clearInfo()
        setAction(' active')
    }

    const handleLogins = async(e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/login', {
                username: username,
                password: password,
            })

            if (response.status === 200){
                console.log(response.data)
                localStorage.setItem('token', response.data.token)
                navigate("/videos")
            }else{alert("Status code not 200")}
        }catch(err){
            if (err.response && err.response.data && err.response.data.message) {
                const errorMessage = `Error ${err.response.status}: ${err.response.data.message}`;
                alert(errorMessage);
            } else {
                console.error(err);
            }
        }
    }


    const handleRegistrations = async(e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/register', {
                username,
                email,
                password,
            })

            if (response.status === 201){
                movetoLogin()
                alert("Registration Successful")
            }else{
                alert("status not 201")
            }
        }catch(err){
            if (err.response && err.response.data && err.response.data.message) {
                const errorMessage = `Error ${err.response.status}: ${err.response.data.message}`;
                alert(errorMessage);
            } else {
                console.error(err);
            }
        }
    }

    return(
        <div className= {`wrapper${action}`}>
            <div className = "form-box login">
                <form action= "form-box login" onSubmit={handleLogins}>
                    <h1>Login</h1>
                    <div><h5>Username</h5></div>
                    <div className = "input-box">
                        <input type = "text" 
                        value = {username} 
                        onChange={(e)=>setUsername(e.target.value)} 
                        placeholder='Username' 
                        required/>
                    </div>
                    <h5>Password</h5>
                    <div className='input-box'>
                        <input type = 'text' 
                        value = {password} 
                        onChange={(e)=> setPassword(e.target.value)} 
                        placeholder='Password' 
                        required/>
                    </div>
                    <button type="submit">Login</button>
                    <div className="register-link">
                        <p><a href ="#" onClick={movetoRegister}>Click me to register yay!</a></p>
                    </div>
                </form>
            </div>

            <div className="form-box register">
                <form action="form-box register" onSubmit={handleRegistrations}>
                    <h1>Register a new User!</h1>
                    <h5>Username</h5>
                    <div className = "input-box">
                        <input type = 'text' 
                        value = {username} 
                        onChange={(e)=> setUsername(e.target.value)} 
                        placeholder="Enter Username" 
                        required/>
                    </div>
                    <h5>Password</h5>
                    <div className = "input-box">
                        <input type = 'text' 
                        value = {password} 
                        onChange={(e)=> setPassword(e.target.value)} 
                        placeholder="Enter Password" 
                        required/>
                    </div>
                    <h5>Email</h5>
                    <div className = "input-box">
                        <input 
                        type = 'text' 
                        value = {email} 
                        onChange={(e)=> setEmail(e.target.value)} 
                        placeholder = "Enter Email Address" 
                        required/>
                    </div>
                    <button type="submit">Register!</button>
                    <div className="register-link"><p><a href = "#" onClick={movetoLogin}>Move back to login page</a></p> </div>
                </form>
            </div>
        </div>
    )
}
export default LoginForm