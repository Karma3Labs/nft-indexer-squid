import {IABI} from '../types'
import {ByteCode, Address} from '../types'
import Web3 from 'web3'

const web3 = new Web3()

// todo migrate to subsquid abi managment, but autogenerated types were broken and would not work
export const ABIManager = (abi: IABI) => {
  const entries = abi
    .filter(({type}) => ['function', 'event'].includes(type))
    .map((e) => {
      let signature = ''
      if (e.type === 'function') {
        signature = web3.eth.abi.encodeFunctionSignature(e)
      } else if (e.type === 'event') {
        signature = web3.eth.abi.encodeEventSignature(e)
      }

      if (e.type === 'function' && !e.outputs) {
        throw new Error(`ABI outputs definition expected for function "${e.name}"`)
      }

      return {
        name: e.name,
        type: e.type,
        signature,
        signatureWithout0x: signature.slice(2),
        outputs: e.outputs ? e.outputs.map((e) => e.type) : [],
        inputs: e.inputs,
      }
    })

  const getEntryByName = (name: string) => {
      const res = entries.find((e) => e.name === name)
      if (!res) {
          throw new Error (`can't find ${name} method/event in existing ABI: ${entries.map(e => e.name).join(', ')}`)
      }
      return res
  }

  const hasAllSignatures = (names: string[], hexData: ByteCode) =>
    names.reduce((acc, name) => {
      const entry = getEntryByName(name)
      if (!entry || !entry.signatureWithout0x) {
        return false
      }

      return hexData.indexOf(entry.signatureWithout0x) !== -1 && acc
    }, true)

  const decodeLog = (topicSignature: string, data: ByteCode, topics: string[]) => {
    const event = entries.find((e) => e.signature === topicSignature)
    if (!event) {
      throw new Error(`No input for event "${topicSignature}"`)
    }
    return web3.eth.abi.decodeLog(event.inputs, data, topics)
  }

  const call = async (methodName: string, params: any[], address: Address) => {
    const entry = getEntryByName(methodName)

    if (!entry || entry.type !== 'function') {
      throw new Error(`${methodName} not found`)
    }
    const inputs = web3.eth.abi.encodeParameters(entry.inputs || [], params)


    /*
    todo
    const response = await RPCClient.call(0, {
      to: address,
      data: entry.signature + inputs.slice(2),
    })
     */
    const response = ''

    return web3.eth.abi.decodeParameters(entry.outputs, response)['0']
  }



  return {
    abi: entries,
    getEntryByName,
    hasAllSignatures,
    call,
    decodeLog,
  }
}
