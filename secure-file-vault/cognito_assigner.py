import re
import boto3

USER_POOL_ID = "<YOUR_USER_POOL_ID>"

# 1) Read and parse details.txt
with open("details.txt") as f:
    text = f.read()

# Match lines like: "Username: customer5, Access Key: AKIA…"
entries = re.findall(r"Username:\s*(\w+),\s*Access Key:\s*(\w+)", text)

# 2) Build list of dicts with group assignment
users = []
for username, access_key in entries:
    if username.startswith("admin"):
        group = "admins"
    elif username.startswith("worker"):
        group = "employees"
    else:
        group = "customers"
    users.append({
        "Username": username,
        "Group": group,
        "Email": f"{username}@example.com",     # change if you have real emails
        "TemporaryPassword": "TempPassword123!"
    })

client = boto3.client("cognito-idp")

# 3) Iterate and call Cognito
for u in users:
    uname = u["Username"]
    try:
        client.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=uname,
            UserAttributes=[
                {"Name": "email", "Value": u["Email"]},
                {"Name": "email_verified", "Value": "true"},
            ],
            TemporaryPassword=u["TemporaryPassword"]
        )
        print(f"Created Cognito user {uname}")
    except client.exceptions.UsernameExistsException:
        print(f"{uname} already exists, skipping creation")

    client.admin_add_user_to_group(
        UserPoolId=USER_POOL_ID,
        Username=uname,
        GroupName=u["Group"]
    )
    print(f"— added {uname} to group {u['Group']}")