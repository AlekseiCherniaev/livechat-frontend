import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await register(username, password);
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((d) => {
              if (d.loc && d.msg) {
                return `${d.loc.slice(1).join('.')}: ${d.msg}`;
              }
              return d.msg || 'Unknown error';
            })
            .join('; '),
        );
      } else {
        setError(detail || 'Unknown error');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <form className="bg-white p-6 rounded-2xl shadow-lg w-80 space-y-4" onSubmit={handleSubmit}>
        <h2 className="text-xl font-semibold text-center">Регистрация</h2>

        {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm mb-2">{error}</div>}

        <input
          className="border p-2 rounded w-full"
          type="text"
          placeholder="Имя пользователя"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="border p-2 rounded w-full"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="bg-green-600 text-white w-full py-2 rounded hover:bg-green-700"
          type="submit"
        >
          Зарегистрироваться
        </button>
      </form>
    </div>
  );
}
