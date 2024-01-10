import { LoginButton } from '../components';

export function Login() {
    return (
        <div className='perfect-center'>
            <p>You're not logged in.</p>
            <p><LoginButton /></p>
            <p>&copy; 2023 - {new Date().getFullYear()} by flrx39.net</p>
        </div>
    );
}
