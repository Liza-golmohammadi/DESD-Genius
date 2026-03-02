import useAuth from "../context/useAuth";

const User = () => {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading...</p>;

  if (!user) {
    return null;
  }

  return (
    <div>
      <h2>User Info</h2>
      <p>{user.id}</p>
      <p>{user.email}</p>
      <p>{user.first_name}</p>
      <p>{user.last_name}</p>
      <p>{user.role}</p>
      <p>{user.is_active}</p>
    </div>
  );
};

export default User;
