USER_LIST=("admin1" "admin2")
POLICY_ARN="arn:aws:iam::aws:policy/AdministratorAccess"

for USER_NAME in "${USER_LIST[@]}"; do
  echo "Creating user: $USER_NAME"
  aws iam create-user --user-name "$USER_NAME"
  aws iam attach-user-policy --user-name "$USER_NAME" --policy-arn "$POLICY_ARN"
  aws iam create-access-key --user-name "$USER_NAME" > "${USER_NAME}_access_keys.json"
  echo "User $USER_NAME created with keys saved."
done
