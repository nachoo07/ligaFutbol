import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Routing from './routes/pages/Routing';
import StudentsProvider from './context/student/StudentContext';
import { LoginProvider } from './context/login/LoginContext';
import UsersProvider from './context/user/UserContext';
import SharesProvider from './context/share/ShareContext';
import { EmailProvider } from './context/email/EmailContext';
import { MotionProvider } from './context/motion/MotionContext';

function App() {
    return (
       
            <LoginProvider>
                <UsersProvider>
                    <StudentsProvider>
                        <SharesProvider>
                            <EmailProvider>
                                <MotionProvider>
                                    <Routing />
                                </MotionProvider>
                            </EmailProvider>
                        </SharesProvider>
                    </StudentsProvider>
                </UsersProvider>
            </LoginProvider>
      
    );
}

export default App;