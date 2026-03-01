# Agent Skill: Kubernetes Debugging Playbook

## Skill Metadata

- **Name**: kubernetes-debugging
- **Domain**: DevOps / Kubernetes
- **Version**: 1.0.0
- **Tags**: kubernetes, k8s, debugging, operations, troubleshooting

---

## Description

A reusable Copilot skill that guides systematic Kubernetes debugging.
Invoke this skill when a pod, service, or workload is misbehaving.

---

## System Prompt

You are an expert Kubernetes engineer. When debugging a Kubernetes issue,
follow the structured playbook below. Ask clarifying questions before
running commands. Prefer non-destructive read commands first.
Always explain *why* you're running each command.

---

## Playbook

### Step 1 – Gather Context

```bash
# What namespace are we in?
kubectl config view --minify | grep namespace

# List all resources in the namespace
kubectl get all -n <namespace>

# Identify the problematic resource
kubectl describe <resource-type>/<resource-name> -n <namespace>
```

### Step 2 – Pod Diagnosis

```bash
# Check pod status and recent events
kubectl get pods -n <namespace> -o wide
kubectl describe pod <pod-name> -n <namespace>

# View current logs
kubectl logs <pod-name> -n <namespace> --tail=100

# View logs from previous crashed container
kubectl logs <pod-name> -n <namespace> --previous --tail=100

# Stream logs in real-time
kubectl logs -f <pod-name> -n <namespace>
```

**Common Pod Issues & Solutions:**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `CrashLoopBackOff` | App crash on startup | Check logs with `--previous` |
| `ImagePullBackOff` | Wrong image name / missing registry creds | Check `imagePullSecrets` |
| `Pending` | Insufficient cluster resources | Check node capacity |
| `OOMKilled` | Memory limit too low | Increase `resources.limits.memory` |
| `Error: 0/N nodes available` | Node selector mismatch | Check `nodeSelector` / taints |

### Step 3 – Resource & Scheduling

```bash
# Check node resource usage
kubectl top nodes
kubectl top pods -n <namespace>

# Check resource requests/limits
kubectl get pod <pod-name> -n <namespace> -o json \
  | jq '.spec.containers[].resources'

# Check if HPA is throttling
kubectl get hpa -n <namespace>
kubectl describe hpa <hpa-name> -n <namespace>
```

### Step 4 – Networking Diagnosis

```bash
# Check service endpoints are populated
kubectl get endpoints <service-name> -n <namespace>

# Test connectivity from within the cluster
kubectl run debug-pod --image=nicolaka/netshoot --rm -it -- bash

# Inside debug pod:
# curl http://<service-name>.<namespace>.svc.cluster.local:<port>/health
# nslookup <service-name>
# traceroute <service-name>

# Check NetworkPolicies that might block traffic
kubectl get networkpolicy -n <namespace>
kubectl describe networkpolicy <policy-name> -n <namespace>

# Check Ingress configuration
kubectl describe ingress -n <namespace>
```

### Step 5 – Configuration & Secrets

```bash
# Check ConfigMaps are correctly mounted
kubectl get configmap -n <namespace>
kubectl describe configmap <cm-name> -n <namespace>

# Check Secrets exist (don't print values!)
kubectl get secret -n <namespace>
kubectl describe secret <secret-name> -n <namespace>

# Verify environment variables inside pod
kubectl exec -it <pod-name> -n <namespace> -- env | grep -i <var-pattern>
```

### Step 6 – RBAC Issues

```bash
# Check what permissions a service account has
kubectl auth can-i --list --as=system:serviceaccount:<namespace>:<sa-name>

# Check role bindings
kubectl get rolebindings,clusterrolebindings -n <namespace> \
  -o custom-columns='NAME:.metadata.name,ROLE:.roleRef.name,SUBJECTS:.subjects[*].name'
```

### Step 7 – Persistent Storage

```bash
# Check PVC status
kubectl get pvc -n <namespace>
kubectl describe pvc <pvc-name> -n <namespace>

# Check storage class
kubectl get storageclass
kubectl describe storageclass <sc-name>
```

---

## Response Templates

When reporting a Kubernetes issue, structure your response as:

```markdown
## Kubernetes Issue Report

**Resource**: <type/name>
**Namespace**: <namespace>
**Symptom**: <what is wrong>

### Root Cause
<explain root cause>

### Evidence
\`\`\`
<relevant log lines / kubectl output>
\`\`\`

### Fix
\`\`\`yaml
# YAML patch or command to fix the issue
\`\`\`

### Prevention
<how to prevent this in the future>
```

---

## Related Skills

- `openapi-client-gen` – for diagnosing API-level issues between microservices
- `python-to-rust` – when considering rewriting performance-critical services
