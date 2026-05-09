import { openContractCall } from '@stacks/connect'
import { stringAsciiCV } from '@stacks/transactions'
import { STACKS_MAINNET } from '@stacks/network'
import { CONTRACT_ADDRESS, CONTRACT_NAME } from './stx'

export async function contractTipSignal(
  signalId: string,
  userSession: any,
  onFinish?: (txId: string) => void
) {
  if (!userSession) return;
  try {
    openContractCall({
      network: STACKS_MAINNET,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'tip-signal',
      functionArgs: [stringAsciiCV(signalId.slice(0, 64))],
      postConditions: [],
      appDetails: { name: 'StackSense', icon: '' },
      onFinish: (data: any) => {
        console.log('Tip tx:', data.txId)
        onFinish?.(data.txId)
      },
      onCancel: () => {},
      userSession,
    })
  } catch (e) {
    console.error('Contract tip failed:', e)
    // Fallback to direct STX transfer if contract not deployed yet
    const { sendTip, ONE_STX } = await import('./stx')
    sendTip(ONE_STX, signalId, onFinish)
  }
}

export async function contractVoteBullish(
  signalId: string,
  userSession: any,
  onFinish?: (txId: string) => void
) {
  if (!userSession) return;
  try {
    openContractCall({
      network: STACKS_MAINNET,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'vote-bullish',
      functionArgs: [stringAsciiCV(signalId.slice(0, 64))],
      postConditions: [],
      appDetails: { name: 'StackSense', icon: '' },
      onFinish: (data: any) => { onFinish?.(data.txId) },
      onCancel: () => {},
      userSession,
    })
  } catch (e) {
    console.error('Vote bullish failed:', e)
  }
}

export async function contractVoteBearish(
  signalId: string,
  userSession: any,
  onFinish?: (txId: string) => void
) {
  if (!userSession) return;
  try {
    openContractCall({
      network: STACKS_MAINNET,
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'vote-bearish',
      functionArgs: [stringAsciiCV(signalId.slice(0, 64))],
      postConditions: [],
      appDetails: { name: 'StackSense', icon: '' },
      onFinish: (data: any) => { onFinish?.(data.txId) },
      onCancel: () => {},
      userSession,
    })
  } catch (e) {
    console.error('Vote bearish failed:', e)
  }
}

export async function getSignalTips(signalId: string): Promise<{ tipCount: number, tipTotal: number }> {
  try {
    const url = `https://api.hiro.so/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-signal-tips`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: CONTRACT_ADDRESS,
        arguments: [stringAsciiCV(signalId.slice(0, 64)).toString()],
      }),
    })

    if (!response.ok) return { tipCount: 0, tipTotal: 0 }
    const data = await response.json()
    return { tipCount: Number(data.result?.value?.['tip-count']?.value || 0), tipTotal: 0 }
  } catch {
    return { tipCount: 0, tipTotal: 0 }
  }
}

export async function getSignalVotes(signalId: string): Promise<{ bullish: number, bearish: number }> {
  try {
    const url = `https://api.hiro.so/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-signal-votes`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: CONTRACT_ADDRESS,
        arguments: [stringAsciiCV(signalId.slice(0, 64)).toString()],
      }),
    })

    if (!response.ok) return { bullish: 0, bearish: 0 }
    const data = await response.json()
    const val = data.result?.value
    return {
      bullish: Number(val?.['bullish-votes']?.value || 0),
      bearish: Number(val?.['bearish-votes']?.value || 0),
    }
  } catch {
    return { bullish: 0, bearish: 0 }
  }
}
