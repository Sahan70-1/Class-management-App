export function MemberAvatar({
  email,
  photo,
}: {
  email: string;
  photo?: string;
}) {
  return (
    <span className="member-avatar" aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : email.charAt(0).toUpperCase()}
    </span>
  );
}
