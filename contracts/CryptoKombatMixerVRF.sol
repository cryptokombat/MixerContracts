//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@chainlink/contracts/src/v0.8/VRFConsumerBase.sol';
import './CryptoKombatMixer.sol';

contract CryptoKombatMixerVRF is CryptoKombatMixer, VRFConsumerBase {
    uint256 public chainlinkFee;
    bytes32 internal keyHash;

    event MixRequested(address indexed account, bytes32 indexed requestId);

    constructor(
        address coordinator_,
        address link_,
        uint256 chainlinkFee_,
        bytes32 keyHash_,
        address collection_
    ) VRFConsumerBase(coordinator_, link_) CryptoKombatMixer(collection_) {
        chainlinkFee = chainlinkFee_;
        keyHash = keyHash_;
    }

    function mixHeroes(uint256[] memory _ids) external override {
        require(LINK.balanceOf(address(this)) >= chainlinkFee, 'CryptoKombatMixer: Not enough LINK');
        require(_ids.length == 3, 'CryptoKombatMixer: Incorrect input length');
        require(isSameEditions(_ids), 'CryptoKombatMixer: Input editions are not same');

        collection.safeBatchTransferFrom(msg.sender, address(this), _ids, _getFilledArray(_ids.length, 1), bytes('0x0'));

        bytes32 requestId = requestRandomness(keyHash, chainlinkFee);

        mixRequests[requestId] = MixRequest({ account: msg.sender, editionIn: heroIdToEdition[_ids[0]], inIds: _ids });

        emit MixRequested(msg.sender, requestId);
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomValue) internal override {
        _getOutcome(requestId, randomValue);
    }

    function withdrawLink(uint256 value) external onlyOwner {
        LINK.transfer(msg.sender, value);
    }
}
