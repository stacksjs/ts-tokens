# CLI Reference

## DAO Commands

```bash
# Create a new DAO
governance dao:create --name "My DAO" --token <mint> --quorum 10 --threshold 66

# Show DAO info
governance dao:info <address>

# Update DAO config
governance dao:config <address> --quorum 15 --threshold 75
```

## Proposal Commands

```bash
# Create a proposal
governance proposal:create <dao> --title "Fund Dev" --description "..."

# List proposals
governance proposal:list <dao> --status active --limit 10

# Show proposal details
governance proposal:info <address>

# Vote on a proposal
governance proposal:vote <address> for

# Execute a passed proposal
governance proposal:execute <address>
```

## Delegation Commands

```bash
# Delegate voting power
governance delegate <dao> <to> --amount 1000

# Remove delegation
governance undelegate <dao>

# Show voting power
governance power <dao>
```

## Treasury Commands

```bash
# Show treasury balance
governance treasury:info <dao>

# Deposit to treasury
governance treasury:deposit <dao> <amount> --token <mint>
```
