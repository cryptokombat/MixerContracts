//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import './interfaces/ICollection.sol';

contract CryptoKombatClaim is Ownable {
    ICollection public collection;

    uint256 public immutable CLAIM_START;
    uint256 public immutable CLAIM_END;
    uint256 public immutable HERO_ID;

    mapping(address => bool) public isClaimed;

    // EVENTS
    event Claimed(address indexed account);

    // CONSTRUCTOR
    constructor(
        address _collection,
        uint256 _heroId,
        uint256 _start,
        uint256 _end
    ) {
        require(_collection != address(0), '!zero');
        require(_heroId != 0, '!zero');
        require(_start != 0, '!zero');
        require(_end != 0, '!zero');
        require(_start < _end, '!time');

        collection = ICollection(_collection);
        CLAIM_START = _start;
        CLAIM_END = _end;
        HERO_ID = _heroId;
    }

    // PUBLIC FUNCTIONS

    function claim() external {
        require(!isClaimed[msg.sender], '!claimed');
        require(block.timestamp >= CLAIM_START, '!start');
        require(block.timestamp <= CLAIM_END, '!end');

        isClaimed[msg.sender] = true;

        collection.mint(msg.sender, HERO_ID, 1, bytes('0x0'));

        emit Claimed(msg.sender);
    }
}
