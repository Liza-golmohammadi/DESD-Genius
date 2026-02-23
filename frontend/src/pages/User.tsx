import useAuth from "../context/useAuth";

const User = () => {
  const { user } = useAuth();
  console.log(user);

  if (!user) {
    return <div>Loading...</div>;
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
