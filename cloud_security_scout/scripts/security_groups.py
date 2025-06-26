import boto3

# --- Configuration ---
# List of common sensitive ports to check. You can customize this list.
SENSITIVE_PORTS = [
    20,   # FTP Data
    21,   # FTP Control
    22,   # SSH
    23,   # Telnet
    25,   # SMTP
    80,   # HTTP
    110,  # POP3
    135,  # MS RPC
    137,  # NetBIOS Name Service
    138,  # NetBIOS Datagram Service
    139,  # NetBIOS Session Service
    143,  # IMAP
    3389, # RDP
    443,  # HTTPS
    445,  # SMB
    1723, # PPTP
    3306, # MySQL
    5432, # PostgreSQL
    5900, # VNC
    6379, # Redis
    8000, # HTTP (common alternative)
    8080, # HTTP Proxy (common alternative)
    8443, # HTTPS (common alternative)
    27017 # MongoDB
]

# --- AWS Interaction ---
def get_aws_security_groups():
  """
  Retrieves all security groups from the AWS account.
  Requires boto3 and appropriate AWS credentials configured.
  """
  try:
    ec2 = boto3.client('ec2')
    response = ec2.describe_security_groups()
    return response['SecurityGroups']
  except Exception as e:
    print(f"Error retrieving security groups: {e}")
    return []

def check_security_group_rules(security_groups):
  """
  Analyzes security group rules for inbound internet access on sensitive ports.
  """
  print("--- Analyzing AWS Security Group Rules ---")
  found_issues = False

  for sg in security_groups:
    sg_name = sg.get('GroupName', 'N/A')
    sg_id = sg.get('GroupId', 'N/A')
    sg_description = sg.get('Description', 'N/A')

    # Iterate through inbound rules (IpPermissions)
    for rule in sg.get('IpPermissions', []):
      from_port = rule.get('FromPort')
      to_port = rule.get('ToPort')
      ip_protocol = rule.get('IpProtocol', 'N/A')

      # Check for public IP ranges (IPv4 and IPv6)
      is_internet_facing = False
      source_ips = []

      for ip_range in rule.get('IpRanges', []):
        cidr_ip = ip_range.get('CidrIp')
        if cidr_ip == '0.0.0.0/0':
          is_internet_facing = True
        source_ips.append(cidr_ip)

      for ipv6_range in rule.get('Ipv6Ranges', []):
        cidr_ipv6 = ipv6_range.get('CidrIpv6')
        if cidr_ipv6 == '::/0':
          is_internet_facing = True
        source_ips.append(cidr_ipv6)

      # Check if the rule is internet-facing and on a sensitive port
      if is_internet_facing:
        # Handle all ports ('-1') or specific port ranges
        if ip_protocol == '-1': # All traffic
          print(f"\nPotential Issue in Security Group '{sg_name}' ({sg_id}):")
          print(f"  Description: {sg_description}")
          print(f"  Rule allows ALL TRAFFIC from internet ({', '.join(source_ips)})")
          found_issues = True
        elif from_port is not None and to_port is not None:
          # Check if any port in the range is sensitive
          for port_to_check in range(from_port, to_port + 1):
            if port_to_check in SENSITIVE_PORTS:
              print(f"\nPotential Issue in Security Group '{sg_name}' ({sg_id}):")
              print(f"  Description: {sg_description}")
              print(f"  Rule allows {ip_protocol} traffic on port(s) {from_port}-{to_port} (includes sensitive port {port_to_check})")
              print(f"  Source: {', '.join(source_ips)}")
              found_issues = True
              break # Found a sensitive port in this rule, move to next rule

  if not found_issues:
    print("\nNo rules found allowing inbound internet traffic on specified sensitive ports.")
  print("\n--- Analysis Complete ---")

# --- Main Execution ---
if __name__ == "__main__":
  print("Starting AWS Security Group audit...")
  security_groups = get_aws_security_groups()

  if security_groups:
    check_security_group_rules(security_groups)
  else:
    print("Could not retrieve security groups. Please check your AWS credentials and permissions.")
